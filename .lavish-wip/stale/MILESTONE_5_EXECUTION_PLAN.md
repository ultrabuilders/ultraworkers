# Neo sai trong MILESTONE_5_EXECUTION_PLAN — 244 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:4983 (drain loop in beginDispose)
- **actual:** packages/coding-agent/src/session/agent-session.ts:5104

## S2
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:4981 (beginDispose opens)
- **actual:** packages/coding-agent/src/session/agent-session.ts:5102

## S3
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:5218 (second drain pass)
- **actual:** packages/coding-agent/src/session/agent-session.ts:5346

## S4
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:5217 (comment explaining the second pass)
- **actual:** packages/coding-agent/src/session/agent-session.ts:5345

## S5
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:719 (#disposers field)
- **actual:** packages/coding-agent/src/session/agent-session.ts:737

## S6
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:2179 (addDisposer push)
- **actual:** packages/coding-agent/src/session/agent-session.ts:2214

## S7
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:250-255 (a contiguous ../utils/* import block)
- **actual:** packages/coding-agent/src/session/agent-session.ts:251,253,254,255,256,258,259,260

## S8
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/session/agent-session.ts:5183-5186 (releaseSharpshooterSession try/catch error-isolation precedent)
- **actual:** packages/coding-agent/src/session/agent-session.ts:5311-5315

## S9
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1347 (disposeFileFallbacks body)
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:1376

## S10
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:537 (#fileFallbackDisposers field)
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:541

## S11
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:777 and :796 (push sites)
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:781 and :800

## S12
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** packages/coding-agent/src/main.ts:1051 (session.addDisposer(stop))
- **actual:** packages/coding-agent/src/main.ts:1059

## S13
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan correction: pi-ref/packages/chord/src/facets/host.ts:125-142 is 'không tồn tại' / unverifiable
- **actual:** pi-ref/packages/chord/src/facets/host.ts:125,129,140-141

## S14
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan correction: node_modules is absent so both `bun test` and `check:ts` are blocked; bun install is a prerequisite
- **actual:** packages/collab-web (5 pre-existing TS errors) + node_modules/ present

## S15
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan gate: `bun run check:ts` must be clean
- **actual:** packages/coding-agent/package.json:522-523 (replacement gate definition)

## S16
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan claim: CHANGELOG.md `## [Unreleased]` 'đang rỗng' (currently empty)
- **actual:** packages/coding-agent/CHANGELOG.md:3,5,7

## S17
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan claim: the second drain pass is 'pass thứ hai trong dispose()'
- **actual:** packages/coding-agent/src/session/agent-session.ts:5268 (#doDispose) and :5138 (dispose)

## S18
- **work item:** W2. Bốn điểm drain: thứ tự ngược và cô lập lỗi
- **cited:** plan's own earlier-stale anchors listed in its 'Đính chính' table: agent-session.ts:4953, :5188, runner.ts:1333, extension-ui-controller.ts:103
- **actual:** packages/coding-agent/src/session/agent-session.ts:5104,5346; extensions/runner.ts:1376; extension-ui-controller.ts:112

## S19
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/collab/protocol.ts:26
- **actual:** packages/coding-agent/src/collab/protocol.ts:28 — `import type { SessionEntry, SessionHeader } from "../session/session-entries";` (line 26 is `import type { CollabSessionState } from "@oh-my-pi/pi-tui/status-line/types";`)

## S20
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:1497
- **actual:** packages/coding-agent/src/task/executor.ts:1505

## S21
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:1597
- **actual:** packages/coding-agent/src/task/executor.ts:1605

## S22
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:2641
- **actual:** packages/coding-agent/src/task/executor.ts:2694

## S23
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:2947
- **actual:** packages/coding-agent/src/task/executor.ts:3000

## S24
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:3321
- **actual:** packages/coding-agent/src/task/executor.ts:3374

## S25
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** packages/coding-agent/src/task/executor.ts:4065
- **actual:** packages/coding-agent/src/task/executor.ts:4121

## S26
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** "Repo HEAD là 5873776 / ecd516f trên nhánh milestone-1" (bảng Đính chính của W3)
- **actual:** 65cc6c1 on milestone-1

## S27
- **work item:** ## W3. Runtime type guard tại biên giải mã của collab frame
- **cited:** W3 correction table: "bun test packages/coding-agent/test/collab/ báo 29 pass / 21 fail kèm Failed to load pi_natives native addon"
- **actual:** bun test packages/coding-agent/test/collab/ now reports 232 pass / 0 fail across 22 files — the addon is built

## S28
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** packages/coding-agent/test/tools/approval.test.ts:818 (và cụm "818–822")
- **actual:** approval.test.ts:816 mở `toMatchObject({`, dòng 817 là `policy: "prompt",`, đóng ở 821. Lệch 2 dòng so với plan (818–822)

## S29
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** packages/coding-agent/test/tools/approval.test.ts:352 (mục bước 8, plan gọi đây là describe block)
- **actual:** approval.test.ts:351 mới là `describe(...)`; dòng 352 là `it("classifies critical bash patterns through BashTool.approval", ...)`

## S30
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** Bảng "Đính chính so với plan" của chính W6: bản sinh đôi compound ở 526–530 với `policy:"deny"` ở dòng 528
- **actual:** bash.ts:524–530 là object literal; `policy: "deny",` nằm ở dòng 527 (526 là `override: true,`). Lệch 1 dòng

## S31
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** packages/coding-agent/src/tools/bash.ts:542–546 (code-shape "Site 2")
- **actual:** bash.ts:542–547; vòng lặp for đóng ở dòng 547 — snippet trong plan thiếu dấu `}` đóng for nên không biên dịch nguyên vẹn nếu gõ nguyên si

## S32
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** packages/coding-agent/src/tools/approval.ts:~252 (code-shape: "The yolo short-circuit at approval.ts:~252")
- **actual:** approval.ts:255 là `if (mode === "yolo") {`, dòng 256 là `if (decision.policy) {`

## S33
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** approval.test.ts:350–370, "corpus top-level rất lớn, khoảng 15 lệnh" (mục Cách sai dễ nhất + Đính chính)
- **actual:** approval.test.ts:353 mở `for (const command of [`, danh sách ở 354–369 = 16 lệnh (không phải ~15)

## S34
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** docs/approval-mode.md:124 (bước 11 — "Sửa ví dụ mở rộng ở docs/approval-mode.md:124")
- **actual:** Dòng 124 đúng là `  isCritical(args.command)` nhưng literal cần gõ nằm ở dòng 125: `    ? { tier: "exec", override: true, reason: "Critical pattern detected" }`. Chấp nhận được vì plan mô tả đúng nội dung, chỉ ghi rõ dòng để gõ

## S35
- **work item:** W6. Deny (không auto-approve) lệnh bash critical-pattern dưới chế độ yolo
- **cited:** packages/coding-agent/test/tools/approval-mode.test.ts (file bị bỏ sót hoàn toàn — không có neo nào trong plan trỏ tới)
- **actual:** approval-mode.test.ts:157 `it("critical bash patterns do not prompt in yolo mode with bash allowed")`, :195 `it("CLI --auto-approve also bypasses safety-override patterns")`, :245 `it("ACP-approved arguments satisfy explicit user and tool-override prompts")` (nửa sau 262–273). Cả ba đều chạy `rm -f /tmp/bun-fake-timer-probe.test.ts` thật. Đo: với cả hai site bash.ts đã sửa, bun test packages/coding-agent/test/tools/ → 7 fail, 3 trong số đó ở file này. Baseline chưa sửa: 16 pass / 0 fail

## S36
- **work item:** W7 — Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL
- **cited:** package.json:93 — correction table cites it as proof that `bun check` = `check:ts` + `check:rs` in parallel
- **actual:** package.json:93 = "lint": "bun run --parallel lint:ts lint:rs"

## S37
- **work item:** W7 — Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL
- **cited:** `bun test` is blocked in this environment — `Failed to load pi_natives native addon for darwin-arm64` → 0 pass, 1 fail, 1 error; and bazel/bazelisk are absent from PATH
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node exists; `bun test packages/catalog/test/` → 955 pass / 0 fail / 123 files; `bun test packages/catalog/test/build.test.ts` → 81 pass / 0 fail

## S38
- **work item:** W7 — Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL
- **cited:** `bun run check:ts` is unstable because parallel sessions write scratch probes `w3-scratch-verify.ts`, `__probe.types.ts`, `__probe2.types.ts` into `packages/coding-agent/`
- **actual:** Run 1 → 5 TS errors in @oh-my-pi/collab-web (`"bye"` not in the frame union); run 2 → 1 TS2741 in @oh-my-pi/pi-coding-agent at src/collab/w3-scratch-verify.ts. Baseline shifts between consecutive runs.

## S39
- **work item:** W7 — Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL
- **cited:** `bun run gen:compat` → `wrote src/compat/rules.json (736 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)`
- **actual:** At HEAD 65cc6c1 the same command prints 737 rules

## S40
- **work item:** W7 — Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL
- **cited:** Step 5: "Viết số không nhấy — KDL parse `300` thành number còn `\"300\"` thành string, và kiểu resolved đòi hỏi một `number`"
- **actual:** The resolved type is a declaration only. `scalarValue` (compile-axes.ts:17-20) returns KdlScalar unchanged (rejects only null); `applyWireAxes` (resolve.ts:131-140) assigns with `Reflect.set(compat, key, wire[key])` on a bare `object` — no type validation.

## S41
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts 2114 LOC
- **actual:** 2237 LOC

## S42
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** packages/agent/test/otel.test.ts 1152 LOC
- **actual:** 1122 LOC

## S43
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** HEAD ecd516f
- **actual:** 65cc6c1

## S44
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:406 = interface AgentTelemetry
- **actual:** line 406 là ' */'; export interface AgentTelemetry { ở dòng 416

## S45
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:418 = resolveTelemetry
- **actual:** line 418 là 'readonly tracer: Tracer;'; export function resolveTelemetry( ở dòng 428

## S46
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:466 = private startSpan
- **actual:** line 466 là 'if (capture === true || capture === "full") return "full";'; function startSpan( ở dòng 476

## S47
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:466-491 thứ tự ưu tiên attribute
- **actual:** 499-512 (operation → model/provider → conversationId → agent → config.attributes → dynamic → caller)

## S48
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:693 = startChatSpan
- **actual:** line 693 là doc comment; export function startChatSpan( ở dòng 711

## S49
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:1116 = finishChatSpan
- **actual:** line 1116 là serializeToolCallArgumentsForTelemetry; export async function finishChatSpan( ở dòng 1134

## S50
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:1162 = span.end()
- **actual:** line 1162 là 'code: "on_chat_usage_failed",'; span.end() trong finishChatSpan ở dòng 1181

## S51
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:2048 = runInActiveSpan
- **actual:** line 2048 là 'telemetry: AgentTelemetry | undefined,'; export function runInActiveSpan<T> ở dòng 2171

## S52
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:2106 re-export Span/SpanKind/SpanStatusCode/Tracer/trace
- **actual:** line 2106 là 'ToolsOkCount = "omp.gen_ai.agent.tools.ok.count",'; re-export ở dòng 2229

## S53
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:755 = attrs[GenAIAttr.RequestStopSequences] = [...request.stopSequences]
- **actual:** line 755 là 'readonly systemPrompt?: string | readonly string[];'; gán mảng thật ở dòng 773

## S54
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** telemetry.ts:764 = attrs[PiGenAIAttr.RequestAvailableTools] = request.tools.map(tool => tool.name)
- **actual:** line 764 là '};'; gán mảng thật ở dòng 782, dùng enum OmpGenAIAttr

## S55
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** §W10 dòng 1347 và §F8 dòng 2558 (được plan tự trích làm neo)
- **actual:** 1347 là ghi chú về node_modules rỗng; 2558 là dấu ```bash

## S56
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** C17 (plan dòng 380) — được dẫn 3 lần làm căn cứ phạm vi commit 2
- **actual:** line 380 là 'expect(map.get("tool_call")).toHaveLength(1);' — C17 không được định nghĩa ở bất kỳ đâu trong plan

## S57
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'nguồn pi-ref không có trong repo này / ls -d pi-ref → NO pi-ref DIRECTORY' nên memory.ts và conformance.ts phải thiết kế từ đầu
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/telemetry/ tồn tại với src/memory.ts (219 LOC), src/testing/conformance.ts (315 LOC), src tổng 935 LOC

## S58
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'commit 2 diễn đạt lại telemetry.ts (2114 LOC) thành adapter trên hợp đồng mới'
- **actual:** telemetry.ts 2237 LOC; seam thật là 2 hàm ở :476 (private startSpan) và :2171 (runInActiveSpan)

## S59
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'git diff --stat liệt kê đúng sáu file mới dưới packages/agent/src/telemetry/'
- **actual:** chỉ 5 file nằm dưới src/telemetry/; file thứ 6 là test/telemetry-conformance.test.ts ở test/ — cổng này luôn xanh vì con số viết sai không khớp trạng thái nào

## S60
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'bun test packages/agent/test/otel.test.ts hiện đang bị chặn: 0 pass / 1 fail / 1 error, Failed to load pi_natives native addon'
- **actual:** 42 pass, 0 fail, 180 expect() calls, 262ms — native addon đã build trong checkout này

## S61
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'Cổng commit 1 chỉ có check:types chạy được; bun run check:ts toàn repo đỏ vĩnh viễn vì file chưa track của W1'
- **actual:** exit 0, 17 package xanh; file chặn (packages/coding-agent/test/zz-w9-probe.test.ts) không còn tồn tại

## S62
- **work item:** W10. Hợp đồng adapter telemetry trung lập vendor + conformance suite
- **cited:** 'Điều này cần kiểm chứng thực nghiệm ở lần chạy đầu tiên: nếu hóa ra đường dẫn sâu vẫn kéo theo natives'
- **actual:** deep path @oh-my-pi/pi-agent-core/telemetry/probe resolve và chạy 1 pass / 0 fail, không nạp native addon (probe đã xoá)

## S63
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** extensibility/extensions/types.ts:1347 = registerTool
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1372 — `registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;`. Lệch 25 dòng. Đây là số trong phần 'Đính chính' của chính work item, tức phần đính chính cũng sai.

## S64
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** extensibility/extensions/types.ts:1379 = registerFileWriteFallback
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:1404 — `registerFileWriteFallback(handler: FileWriteFallbackHandler): void;`. Lệch 25 dòng.

## S65
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** task/executor.ts:3960 = createAgentSession
- **actual:** packages/coding-agent/src/task/executor.ts:4016 — `const sessionPromise = createAgentSession(buildSubagentSessionOptions(sessionManager, null));`. Dòng :3960 thật sự chứa `workPoolYieldItems:`. Lệch 56 dòng.

## S66
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** packages/agent/src/agent-loop.ts:3589-3611 = cơ chế nối tool exclusive
- **actual:** packages/agent/src/agent-loop.ts:3587-3614. `:3609` `const start = concurrency === "exclusive" ? Promise.all([lastExclusive, ...sharedTasks]) : lastExclusive;` · `:3613` `lastExclusive = task;` · `:3614` `sharedTasks = [];`. Range work item nêu dừng ở :3611, tức cắt mất đúng phép gán mà nó đang mô tả.

## S67
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** extensibility/extensions/runner.ts:778 = chỗ nối addFileWriteFallback
- **actual:** packages/coding-agent/src/extensibility/extensions/runner.ts:782 — `addFileWriteFallback(async req => {`. Lệch 4 dòng.

## S68
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** file-write-fallback.ts:440-452 = vòng lặp fallbackHandlers
- **actual:** packages/coding-agent/src/tools/file-write-fallback.ts:444-453 — `for (const handler of Array.from(fallbackHandlers)) {` ở :444, đóng `}` ở :453. Lệch 4 dòng.

## S69
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** file-write-fallback.ts:18-32 = doc comment nói có BỐN call site
- **actual:** packages/coding-agent/src/tools/file-write-fallback.ts:17-31. Doc comment CÓ nói bốn và CÓ kể edit/hashline/filesystem.ts + edit/modes/patch.ts — nội dung đúng, chỉ lệch nhẹ vùng dòng.

## S70
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** ast-edit.ts:85-95 = vòng lặp runAstEditTargets
- **actual:** packages/coding-agent/src/tools/ast-edit.ts:86-97 — `for (const target of targets) {` ở :86, `astEdit({` ở :87. Lệch 1 dòng.

## S71
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** edit/index.ts:222 = apply_patch là một edit MODE được chọn tại đây
- **actual:** packages/coding-agent/src/edit/index.ts:222 là `if (mode === "patch" || mode === "apply_patch") {` — một nhánh kiểm tra mode trong toPerFileResult, KHÔNG phải chỗ chọn mode. Chỗ chọn thật: :358.

## S72
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** ast-edit.ts:87, :137 — ghi đi qua native astEdit qua urlFilesystem.shellFilesystem()
- **actual:** packages/coding-agent/src/tools/ast-edit.ts:291 và :438. Ở :87/:137 filesystem đến từ `options.filesystem`; `shellFilesystem()` chỉ là nơi cấp nó. Nội dung cốt lõi (không đi qua writeFileWithFallback) vẫn đúng.

## S73
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** CHANGELOG.md — bước 8: thêm dòng dưới `## [Unreleased]` → `### Fixed`
- **actual:** packages/coding-agent/CHANGELOG.md:3 là `## [Unreleased]`, nhưng dưới nó CHỈ có `### Security` (:5). `### Fixed` không tồn tại. Work item tưởng section đã có sẵn.

## S74
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** Verification block: `brew install ninja` BẮT BUỘC — cmake build của opusic-sys cần Ninja, thiếu nó exit 1 với 'CMake was unable to find a build program corresponding to Ninja'
- **actual:** packages/natives/package.json:32 → `"build": "bun ../../scripts/bazel-natives.ts host --dest native"`. Không có tham chiếu cmake/ninja nào trong packages/natives/package.json hay scripts/bazel-natives.ts. Claim này SAI với cây này.

## S75
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** Trạng thái đã quan sát: `bun test packages/coding-agent/test/tools/ast-edit.test.ts` báo 0 pass / 1 fail / 1 error với 'Failed to load pi_natives native addon for darwin-arm64'
- **actual:** Đã chạy thật: `bun test packages/coding-agent/test/tools/ast-edit.test.ts` → `7 pass / 0 fail / 46 expect() calls` trong 924ms. `import("@oh-my-pi/pi-natives")` trả 128 export. Claim SAI tại HEAD 65cc6c1.

## S76
- **work item:** W12. Tuần tự hoá các thay đổi file đồng thời theo realpath
- **cited:** Tiền đề trong mô tả task: 'git HEAD 5873776'
- **actual:** git log -1 → 65cc6c1 'test(coding-agent): opt in explicitly where the suite is about parsing'

## S77
- **work item:** W2
- **cited:** «Trên máy chưa build, bun test báo 0 pass / 1 fail / 1 error với Failed to load pi_natives native addon» + khối cài ninja/brew install ninja + bun --cwd=packages/natives run build; Effort ghi «Phần lớn công sức nằm ở phần xác minh: bun test bị chặn trong môi trường này cho tới khi addon native được build»
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node tồn tại (185 MB, 2026-09-29 07:32); ninja ở /opt/homebrew/bin/ninja; `cd packages/coding-agent && bun test test/pi-scope-aliases.test.ts` → 1 pass / 0 fail / 2 expect() calls, 548ms

## S78
- **work item:** W2
- **cited:** «Kỳ vọng: → 8 pass / 0 fail» (khối verification) trong khi khối gate cùng mục ghi «Kỳ vọng: 1 pass, 0 fail»
- **actual:** packages/coding-agent/test/pi-scope-aliases.test.ts:129 là khối it() duy nhất; grep -c '^\s*it(' → 1; grep -c 'aliasSpecifier:' → 7 ca

## S79
- **work item:** W2
- **cited:** HEAD là 1454dc0 trên nhánh milestone-1 (mục Đính chính, dòng 690; lặp lại ở dòng 153 và 197)
- **actual:** git rev-parse --short HEAD → 47720fd; git branch --show-current → milestone-1

## S80
- **work item:** W2
- **cited:** «Cần một số dòng chuẩn» cho result.errors — spec tự ghi mâu thuẫn giữa :129, :130, :131, :129-134 (mục Cần người xác nhận #1)
- **actual:** packages/coding-agent/test/pi-scope-aliases.test.ts:131 chứa `expect(result.errors).toEqual([]);`

## S81
- **work item:** W2
- **cited:** «bun run check:ts … Mất ~25 giây (đo bằng /usr/bin/time -p)»
- **actual:** package.json:90 "check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"

## S82
- **work item:** W2
- **cited:** «Comment ở 789-795 nói «or the canonical @oh-my-pi scope itself» — vẫn đúng ở thời điểm này [W2a]»
- **actual:** packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:791 nói «fork, or the canonical @oh-my-pi scope itself) are remapped to this scope and» — sau khi W2b flip CANONICAL_PI_SCOPE sang @ultraworkers thì @oh-my-pi không còn là canonical

## S83
- **work item:** W2
- **cited:** Cổng W2a dựa vào hai git grep exit-code; spec tự cảnh báo «nếu dùng mẫu "@oh-my-pi" thay vì khớp trực tiếp dòng PI_SCOPE_ALIASES, cổng sẽ luôn xanh và bắt được gì cả»
- **actual:** Đã xác nhận bằng cách áp W2a rồi bỏ "oh-my-pi" khỏi PI_SCOPE_ALIASES: bun test đỏ, nhưng check:ts vẫn exit 0 (cả hai hằng số là `as const` dùng trong new RegExp và template string, không tạo lỗi type nào)

## S84
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:21
- **actual:** packages/utils/src/dirs.ts:22 (dòng 21 là doc comment '/** App name (e.g. "omp") */')

## S85
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:24
- **actual:** packages/utils/src/dirs.ts:25

## S86
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** packages/utils/src/dirs.ts:28

## S87
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:36
- **actual:** packages/utils/src/dirs.ts:37

## S88
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:360
- **actual:** packages/utils/src/dirs.ts:370

## S89
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:609
- **actual:** packages/utils/src/dirs.ts:619

## S90
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:620-622
- **actual:** packages/utils/src/dirs.ts:630-631

## S91
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:621
- **actual:** packages/utils/src/dirs.ts:631

## S92
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:748
- **actual:** packages/utils/src/dirs.ts:758-760

## S93
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:890/894
- **actual:** packages/utils/src/dirs.ts:740, 755, 788, 807, 912, 916 (các hàm rootSubdir(..., 'cache'))

## S94
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:956
- **actual:** packages/utils/src/dirs.ts:975-976

## S95
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:960
- **actual:** packages/utils/src/dirs.ts:980-981

## S96
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:983
- **actual:** packages/utils/src/dirs.ts:1003-1006

## S97
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:990
- **actual:** packages/utils/src/dirs.ts:1015-1017

## S98
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:1078
- **actual:** packages/utils/src/dirs.ts:1098

## S99
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:1085
- **actual:** packages/utils/src/dirs.ts:1105

## S100
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/src/dirs.ts:1083-1086
- **actual:** packages/utils/src/dirs.ts:1104-1105

## S101
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/coding-agent/src/main.ts:285
- **actual:** packages/coding-agent/src/main.ts:293

## S102
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:77
- **actual:** packages/utils/test/logger-contract.test.ts:76

## S103
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:105
- **actual:** packages/utils/test/logger-contract.test.ts:104

## S104
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:135
- **actual:** packages/utils/test/logger-contract.test.ts:134

## S105
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:286
- **actual:** packages/utils/test/logger-contract.test.ts:285

## S106
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:296
- **actual:** packages/utils/test/logger-contract.test.ts:295

## S107
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:313
- **actual:** packages/utils/test/logger-contract.test.ts:312

## S108
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:333
- **actual:** packages/utils/test/logger-contract.test.ts:332

## S109
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/logger-contract.test.ts:38-73
- **actual:** packages/utils/test/logger-contract.test.ts:34-72

## S110
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/utils/test/dirs.test.ts:82
- **actual:** packages/utils/test/dirs.test.ts:96

## S111
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/tui/test/desktop-notify.test.ts:114, 117, 132, 144, 147, 153, 163, 166, 202
- **actual:** packages/tui/test/desktop-notify.test.ts:108, 111, 126, 138, 141, 147, 157, 160, 196

## S112
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** packages/ai/src/auth-broker/remote-store.ts:1314-1315
- **actual:** packages/ai/src/auth-broker/remote-store.ts:1415-1417

## S113
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** relay/server.ts:55
- **actual:** packages/coding-agent/src/tools/browser/relay/server.ts:55

## S114
- **work item:** W3 — Hằng số lớp hiển thị + dọn literal trùng lặp (sóng 1)
- **cited:** W3 'Bước 0' — bun test cần brew install ninja + build native addon
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node tồn tại; which ninja → /opt/homebrew/bin/ninja; 4 lệnh bun test đã chạy thật: 17/4/12/6 pass, 0 fail

## S115
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** packages/utils/src/dirs.ts:28

## S116
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:589-591
- **actual:** packages/utils/src/dirs.ts:599-601

## S117
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:590
- **actual:** packages/utils/src/dirs.ts:600

## S118
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:297-298
- **actual:** packages/utils/src/dirs.ts:307-308

## S119
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:360
- **actual:** packages/utils/src/dirs.ts:370

## S120
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:24
- **actual:** packages/utils/src/dirs.ts:25

## S121
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/utils/src/dirs.ts:36
- **actual:** packages/utils/src/dirs.ts:37

## S122
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/coding-agent/test/agent-session-concurrent.test.ts:1630
- **actual:** packages/coding-agent/test/agent-session-concurrent.test.ts:1597

## S123
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/coding-agent/test/advisor-toggle.test.ts:268,272
- **actual:** packages/coding-agent/test/advisor-toggle.test.ts:262, 266

## S124
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/coding-agent/test/extensions-discovery.test.ts:149,747,767,792
- **actual:** packages/coding-agent/test/extensions-discovery.test.ts:136, 651, 671, 696

## S125
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** test/discovery/monorepo-skills.test.ts (W6 dùng làm 'phủ thật' của site helpers.ts:47)
- **actual:** KHÔNG TỒN TẠI — file gần nhất là agents-monorepo-skills.test.ts nhưng có 0 literal .omp và 0 hit SOURCE_PATHS, không phủ site này

## S126
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1587-1591
- **actual:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1596-1600

## S127
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** legacy-pi-coding-agent-shim.ts:1592
- **actual:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1601

## S128
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** package.json:94-95 (cổng check:ts của W6)
- **actual:** package.json:90

## S129
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** package.json:93-94 (lệnh cổng 'bun run check')
- **actual:** package.json:89

## S130
- **work item:** ## W6. Lật `CONFIG_DIR_NAME` (sóng 2)
- **cited:** HEAD phải là 1454dc0 (điều kiện tiên quyết của bước 1)
- **actual:** 47720fd (nhánh milestone-1)

## S131
- **work item:** W6a
- **cited:** packages/utils/src/dirs.ts:590
- **actual:** packages/utils/src/dirs.ts:600 (hàm bắt đầu ở 599)

## S132
- **work item:** W6a
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** packages/utils/src/dirs.ts:28

## S133
- **work item:** W6a
- **cited:** packages/utils/src/dirs.ts:298
- **actual:** packages/utils/src/dirs.ts:308 (hàm bắt đầu ở 307)

## S134
- **work item:** W6a
- **cited:** packages/utils/src/dirs.ts:360
- **actual:** packages/utils/src/dirs.ts:370

## S135
- **work item:** W6a
- **cited:** dirs.ts:21 APP_NAME, :24 APP_URL, :30 MAIN_CONFIG_FILENAMES, :36 USER_AGENT
- **actual:** dirs.ts:22, :25, :31, :37

## S136
- **work item:** W6a
- **cited:** packages/coding-agent/test/extensions-discovery.test.ts:149, 747, 767, 792
- **actual:** File chỉ dài 768 dòng nên :792 vượt EOF. Call site getProjectAgentDir thật: 23, 136, 651, 671, 696

## S137
- **work item:** W6a
- **cited:** packages/coding-agent/test/advisor-toggle.test.ts:268, 272
- **actual:** advisor-toggle.test.ts:262, 266

## S138
- **work item:** W6a
- **cited:** legacy-pi-coding-agent-shim.ts:1588, 1589, 1592
- **actual:** packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:1597, 1598, 1601 (file dài 1658)

## S139
- **work item:** W6a
- **cited:** packages/coding-agent/src/config.ts:84 USER_CONFIG_BASES, :90 PROJECT_CONFIG_BASES
- **actual:** config.ts:85 và :91

## S140
- **work item:** W6a
- **cited:** dirs.test.ts:52-60 (dọn thư mục tạm bằng fs.rmSync trong finally)
- **actual:** dirs.test.ts:66-75, fs.rmSync ở dòng 74, finally ở 73-75

## S141
- **work item:** W6a
- **cited:** dirs.test.ts:17-20 (vi.restoreAllMocks trong afterEach)
- **actual:** dirs.test.ts:18-20 (afterEach ở 18, restoreAllMocks ở 19, setProjectDir ở 20)

## S142
- **work item:** W6a
- **cited:** "bun test bị CHẶN — native addon chưa build, mọi test báo 0 pass / 1 fail / 1 error"
- **actual:** SAI. packages/natives/native/pi_natives.darwin-arm64.node tồn tại, ninja ở /opt/homebrew/bin/ninja, cả 4 nhóm đối chứng âm coding-agent chạy xanh (omfg 3/0, extensions-discovery 35/0, advisor-toggle 43/0)

## S143
- **work item:** W6a
- **cited:** dirs.test.ts kỳ vọng "6 pass / 0 fail"
- **actual:** 6 pass, 1 skip, 0 fail, 9 expect() calls (có 1 skip mà plan không nói)

## S144
- **work item:** W6a
- **cited:** ".omp/ có 14 file git-tracked (commands 5, skills 6, tools 3)"
- **actual:** 16 file: commands 5, skills 8, tools 3

## S145
- **work item:** W6a
- **cited:** "Bỏ qua bước 3 thì omfg-controller.test.ts và agent-session-rules-reload.test.ts đỏ"
- **actual:** Sai. Cả hai vẫn XANH khi phá dirs.ts:600 (3 pass/0 fail và 6 pass/0 fail). Chúng không dùng getProjectAgentDir, tự join literal rồi so với omfg-controller.ts:285 vốn cũng tự join literal. Bằng chứng đúng cho dirs.ts:600 là extensions-discovery (4 fail) + advisor-toggle (1 fail)

## S146
- **work item:** W6a
- **cited:** Lệnh cổng `bun test test/project-dir-name-pinned.test.ts test/dirs.test.ts test/install-id.test.ts test/config-dir-dual-root.test.ts test/install-id-legacy-read.test.ts`
- **actual:** Thiếu tiền tố ./ nên báo 11 pass / 1 skip / 0 fail EXIT 0 dù project-dir-name-pinned.test.ts chưa tồn tại. Đã viết lại với ./ (EXIT 1 khi file thiếu)

## S147
- **work item:** W6a
- **cited:** getConfigWriteRoot / getConfigDirCandidates tồn tại (W4), APP_NAME đã mang giá trị mới (W3)
- **actual:** W4 chưa land (grep NO HITS trong dirs.ts; config-dir-dual-root.test.ts và install-id-legacy-read.test.ts chưa tồn tại). W3 chưa land (APP_NAME = "omp" tại dirs.ts:22)

## S148
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** HEAD 1454dc0 (mọi con số trong W7 được đo và ghim vào mốc này)
- **actual:** HEAD = 47720fd42c075bdd076fa1ec176dc2417325f035 (nhánh milestone-1)

## S149
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bước 4: "Kỳ vọng tại HEAD 1454dc0: 4118 dòng"
- **actual:** 4114 file

## S150
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bước 5 + GATE dry-run Bước 6: "Kỳ vọng 17212" (hardcode trong `test ... -eq 17212`)
- **actual:** 17252 lượt

## S151
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bảng dòng cuối "(4100 file còn lại trong tập in-scope)" và phần xác nhận #1: 4100 file / 17000 lượt
- **actual:** 4096 file / 17040 lượt

## S152
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bảng File cần chạm tới: "12 mục ghim ... (tất cả đều pin 18.3.3)"
- **actual:** Đều là 18.4.0

## S153
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bước 3 + GATE B: "Baseline PHẢI là 13 file / 85 lượt"
- **actual:** 14 file / 85 lượt

## S154
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Đính chính: "Dạng trần "oh-my-pi" nằm trong 15 file... File thứ 16 là COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md"
- **actual:** Vẫn 16 file, nhưng nay gồm COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md, MILESTONE_5_EXECUTION_PLAN.md, RESEARCH_DSH_OMO_2026-09-28.md, RESEARCH_FINDINGS_2026-09-28.md + 12 file nguồn/test

## S155
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** GATE E: "Riêng GATE E KHÔNG đỏ được ở máy này vì bun test không chạy" + Sai lầm 9 + phần Xác minh (đo tại 106eb3e khi addon CHƯA build)
- **actual:** ĐÃ SẴN SÀN — GATE E phải chạy thật

## S156
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Xác minh: "Lệnh build bun --cwd=packages/natives run build cần ninja... CMake báo lỗi Ninja"
- **actual:** build = "bun ../../scripts/bazel-natives.ts host --dest native" (Bazel, không phải CMake)

## S157
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Q1 (chặn W7): "Sáu leaf package @oh-my-pi/pi-natives-<tag> đã được publish dưới scope MỚI chưa?"
- **actual:** CHƯA. npm view @ultraworkers/pi-natives-linux-x64 -> 404 Not Found; npm view @oh-my-pi/pi-natives-linux-x64 -> 18.4.2

## S158
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Q4: "Scope @ultraworkers đã được ai sở hữu chưa?" (cổng G3 của plan §8)
- **actual:** CHƯA TỒN TẠI. npm view @ultraworkers/pi-ai -> 404; @ultraworkers/omp-stats -> 404

## S159
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bước 5: lệnh `xargs -a /tmp/w7-inscope-files.txt grep -o -F '@oh-my-pi/' | wc -l`
- **actual:** HỎNG: `xargs: invalid option -- a` -> trả 0

## S160
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Tài liệu không nhắc tới file sinh leaf package
- **actual:** packages/natives/scripts/gen-npm-packages.ts:93 — `name: \`@oh-my-pi/pi-natives-${tag}\`,`

## S161
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Không có trong tài liệu
- **actual:** packages/natives/scripts/gen-npm-packages.ts:103 — url: "git+https://github.com/can1357/oh-my-pi.git"

## S162
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Bước 4 chỉ loại trừ 4 mẫu (CHANGELOG, .lavish-wip, COMPREHENSIVE_PLAN, MILESTONE_*)
- **actual:** Đã bao hàm — nhưng 2 transcript .jsonl (810 lượt) VẪN CÒN trong tập, chờ Q2

## S163
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Sai lầm 7: ".lavish-wip/specs/*.spec.json (13 file, 68 lượt)"
- **actual:** Không còn 13 file specs/*.spec.json — thư mục .lavish-wip/ hiện toàn thư mục con đã commit (impl/, findings/, DECISION-*.md, …), đã bị loại trừ bởi exclude .lavish-wip/**

## S164
- **work item:** W7. Đổi npm scope — lượt cơ học trên hàng nghìn file (sóng 3)
- **cited:** Cổng hoàn thành: "GATE 0, A, B, C, D đều ... đã được đo là chạy được trên máy này"
- **actual:** Đã chạy lại và xác nhận: GATE 0 cả 3 nhánh, GATE A cả 2 chiều, GATE F cả 3 trạng thái — đều phân biệt đúng. GATE A2/D cần sau pass nên chưa chạy

## S165
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/src/modes/acp/acp-agent.ts:656 — agentInfo.name = "oh-my-pi"
- **actual:** packages/coding-agent/src/modes/acp/acp-agent.ts:656 is now `name: "omp",` — the bare literal no longer exists in this file

## S166
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/acp-initialize-conformance.test.ts:235 — agentInfo.name === "oh-my-pi"
- **actual:** packages/coding-agent/test/acp-initialize-conformance.test.ts:235 is now `title: "omp",` — the `name: "oh-my-pi"` assertion was deleted

## S167
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/acp-lazy-startup.test.ts:375 — expect.objectContaining({ name: "oh-my-pi" })
- **actual:** packages/coding-agent/test/acp-lazy-startup.test.ts:375 is now `protocolVersion: 1,` — the agentInfo line was deleted

## S168
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** docs/provider-quirks.md:1706 — describes zai.ts KEY_NAME wire value
- **actual:** docs/provider-quirks.md:1710 — line 1706 is blank (file grew from 1750 to 1754 lines)

## S169
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/tools/web-search-exa.test.ts:608 — x-exa-source === "oh-my-pi"
- **actual:** packages/coding-agent/test/tools/web-search-exa.test.ts:577

## S170
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/ai/test/cursor-exec-modern.test.ts:1474
- **actual:** packages/ai/test/cursor-exec-modern.test.ts:1450

## S171
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/ai/test/cursor-exec-modern.test.ts:1482
- **actual:** packages/ai/test/cursor-exec-modern.test.ts:1458

## S172
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:214
- **actual:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:152

## S173
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:222
- **actual:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:160

## S174
- **work item:** W8a. 15 file literal dạng trần (sóng 3)
- **cited:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:254, 263
- **actual:** packages/coding-agent/test/tools/web-scrapers/git-hosting.test.ts:192, 201

## S175
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/coding-agent/src/modes/acp/acp-agent.ts:656
- **actual:** Cùng dòng 656, nhưng nội dung đã đổi thành `				name: "omp",` — MATCH ERE. Đổi bởi commit f804d66 «Sync from upstream omp 18.4.0»: diff `-name: "oh-my-pi"` → `+name: "omp"`.

## S176
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:21
- **actual:** Dòng 22. Dòng 21 nay là docblock `/** App name (e.g. "omp") */`.

## S177
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:24
- **actual:** Dòng 25. Dòng 24 nay là docblock `/** Public homepage that inference gateways ... credit omp traffic to. */`

## S178
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** Dòng 28. Dòng 27 nay là docblock. GIÁ TRỊ vẫn là `".omp"` (đã xác nhận bằng `od -c` và `git show HEAD:` — không phải `.ultraworkers`).

## S179
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:30
- **actual:** Dòng 34 (lệch 4).

## S180
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:36
- **actual:** Dòng 40 (lệch 4). Dòng 36 nay là docblock `/** Default User-Agent header string (e.g. "omp/17.2.12") */`.

## S181
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:298
- **actual:** Dòng 311 (lệch 13). Dòng 298 nay là `export function getSafeProjectCwd(): string {`. `getConfigDirName()` khai ở dòng 310.

## S182
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** packages/utils/src/dirs.ts:1084
- **actual:** Dòng 1107 (lệch 23). Dòng 1084 nay là `	if (scope === "user") {`.

## S183
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** package.json:90
- **actual:** Dòng 86. Dòng 90 thật sự là `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",` — neo bị gán nhầm sang cổng typecheck.

## S184
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13361 (tra bằng `grep -n '^| N1 |'`)
- **actual:** NEO CHẾT: `grep -n '^| N1 |'` trả về RỖNG. Bảng N1–N17 không tồn tại ở dạng hàng `| N1 |` markdown ở HEAD này. Mục `do_not_rename` nằm ở dòng 16895 và mô tả bằng văn xuôi, trỏ tới `scripts/rename/keep-list.txt` (W7) và `do_not_rename.tsv` (W6) — cả hai đều chưa tồn tại trên cây.

## S185
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:14183 (`grep -n 'W8b không quy ra ngày được'`)
- **actual:** Dòng 19392 và 21690.

## S186
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13968 (`grep -n 'W1, W2, W3 (hằng số đã ổn định)'`)
- **actual:** Dòng 19409 và 19444.

## S187
- **work item:** W8b. 599 file có token hiển thị `omp` — mục L duy nhất (sóng 3)
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:14107 (`grep -n 'Tách thành hai pass với exclusion list'`)
- **actual:** Dòng 19430 và 21614.

## S188
- **work item:** W10
- **cited:** package.json:91
- **actual:** package.json:87 — line 91 is "check:tools"

## S189
- **work item:** W10
- **cited:** packages/coding-agent/src/cli/update-cli.ts:1206
- **actual:** update-cli.ts:1208 (line 1206 is blank)

## S190
- **work item:** W10
- **cited:** packages/coding-agent/src/cli/update-cli.ts:1208
- **actual:** update-cli.ts:1210

## S191
- **work item:** W10
- **cited:** packages/utils/src/dirs.ts:24
- **actual:** dirs.ts:25 (line 24 is a doc comment)

## S192
- **work item:** W10
- **cited:** packages/utils/src/dirs.ts:36
- **actual:** dirs.ts:37 (line 36 is a doc comment)

## S193
- **work item:** W10
- **cited:** scripts/ci-release-publish.ts:165
- **actual:** ci-release-publish.ts:186 (line 165 is a package dir entry)

## S194
- **work item:** W10
- **cited:** Cargo.toml:30
- **actual:** Cargo.toml:31

## S195
- **work item:** W10
- **cited:** Cargo.toml:31
- **actual:** Cargo.toml:32

## S196
- **work item:** W10
- **cited:** nix/package.nix:198
- **actual:** nix/package.nix:204

## S197
- **work item:** W10
- **cited:** nix/package.nix:208
- **actual:** nix/package.nix:214

## S198
- **work item:** W10
- **cited:** nix/package.nix:209
- **actual:** nix/package.nix:215

## S199
- **work item:** W10
- **cited:** nix/package.nix:210
- **actual:** nix/package.nix:216

## S200
- **work item:** W10
- **cited:** nix/package.nix:213
- **actual:** nix/package.nix:219

## S201
- **work item:** W10
- **cited:** nix/package.nix:227
- **actual:** nix/package.nix:233

## S202
- **work item:** W10
- **cited:** nix/package.nix:230
- **actual:** nix/package.nix:236

## S203
- **work item:** W10
- **cited:** nix/package.nix:244
- **actual:** nix/package.nix:250

## S204
- **work item:** W10
- **cited:** nix/package.nix:245
- **actual:** nix/package.nix:251

## S205
- **work item:** W10
- **cited:** nix/package.nix:247
- **actual:** nix/package.nix:253

## S206
- **work item:** W10
- **cited:** nix/package.nix:248
- **actual:** nix/package.nix:254

## S207
- **work item:** W10
- **cited:** nix/package.nix:256
- **actual:** nix/package.nix:262

## S208
- **work item:** W10
- **cited:** nix/package.nix:263
- **actual:** nix/package.nix:269

## S209
- **work item:** W10
- **cited:** nix/package.nix:265
- **actual:** nix/package.nix:271

## S210
- **work item:** W10
- **cited:** nix/package.nix:273
- **actual:** nix/package.nix:277

## S211
- **work item:** W10
- **cited:** nix/package.nix:275
- **actual:** nix/package.nix:281

## S212
- **work item:** W10
- **cited:** nix/package.nix:277
- **actual:** nix/package.nix:283

## S213
- **work item:** W10
- **cited:** nix/package.nix:282
- **actual:** nix/package.nix:288

## S214
- **work item:** W10
- **cited:** nix/package.nix:286
- **actual:** nix/package.nix:292

## S215
- **work item:** W10
- **cited:** nix/package.nix:287
- **actual:** nix/package.nix:293

## S216
- **work item:** W10
- **cited:** nix/package.nix:296
- **actual:** nix/package.nix:302

## S217
- **work item:** W10
- **cited:** nix/package.nix:305
- **actual:** nix/package.nix:311

## S218
- **work item:** W10
- **cited:** nix/package.nix:308
- **actual:** nix/package.nix:314

## S219
- **work item:** W10
- **cited:** nix/nixos-module.nix — plan claims "không có hit omp trực tiếp"
- **actual:** nix/nixos-module.nix:9,12,18

## S220
- **work item:** W10
- **cited:** nix/dev-shell.nix — plan claims "không có hit omp trực tiếp"
- **actual:** nix/dev-shell.nix:18

## S221
- **work item:** W10
- **cited:** plan: bảng "File cần chạm tới" có 30 dòng (bước review yêu cầu khớp 30)
- **actual:** 33 table rows, lines 3332-3470 of MILESTONE_5_EXECUTION_PLAN.md

## S222
- **work item:** W10
- **cited:** plan §Cổng: "Kỳ vọng: 37 pass / 0 fail (4 + 2 + 11 + 17 + 3)"
- **actual:** measured: 35 pass / 0 fail / 98 expect

## S223
- **work item:** W10
- **cited:** plan: "CỔNG CỐ Ý KHÔNG dùng `bun run test:scripts`" because the native addon is unbuilt
- **actual:** stale premise — addon IS built (commit 47720fd)

## S224
- **work item:** W10
- **cited:** plan: `.github/workflows/ci.yml` nhóm ĐỔI (21 dòng)
- **actual:** 9 missing lines found by full grep of ci.yml

## S225
- **work item:** W10
- **cited:** plan: `scripts/install.ps1` 5 dòng được nêu
- **actual:** install.ps1:277,281,312,325,327

## S226
- **work item:** W10
- **cited:** plan: `scripts/install-tests/settings-session.ts` — "9 lượt omp, sửa phần tên lệnh, GIỮ phần path .omp"
- **actual:** settings-session.ts:10,17,39,73,112,152,153,214

## S227
- **work item:** W10
- **cited:** plan: `scripts/musl-release.test.ts` not in the "File cần chạm tới" table
- **actual:** musl-release.test.ts:71,87,88

## S228
- **work item:** W10
- **cited:** plan: `packages/coding-agent/src/cli/update-cli.ts` — "KHÔNG SỬA Ở W10" (implied safe)
- **actual:** packages/coding-agent/test/update-cli.test.ts:418,442,968,969,1025,1455,1456,1670

## S229
- **work item:** W10
- **cited:** not in the plan at all
- **actual:** packages/metaharness/src/tb/agent.ts:62,75 and packages/metaharness/src/launch-args.ts:41,77

## S230
- **work item:** W10
- **cited:** not in the plan at all
- **actual:** packages/coding-agent/package.json:28 ("omp": "src/cli.ts") and scripts/link-omp.sh:30,31

## S231
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** packages/coding-agent/package.json:3
- **actual:** packages/coding-agent/package.json:3

## S232
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** scripts/ci-release-publish.test.ts:212, :242
- **actual:** scripts/ci-release-publish.test.ts:214, :244

## S233
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** scripts/ci-release-publish.ts:69 ("Interface PublishPackage ở :69")
- **actual:** scripts/ci-release-publish.ts:49, :69

## S234
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** packages/coding-agent/src/cli/update-cli.ts:183-188 ("docblock hợp đồng stub")
- **actual:** packages/coding-agent/src/cli/update-cli.ts:172-188

## S235
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** Plan "Hình dạng code" block quoting scripts/ci-release-publish.ts:69 and :240
- **actual:** scripts/ci-release-publish.ts:69, :240

## S236
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** Plan Tier 3 gate: "which ninja → không có; brew list ninja → No such keg"
- **actual:** /opt/homebrew/bin/ninja present; bun --cwd=packages/natives run build exits 0

## S237
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** Plan Tier 3 gate: "bun run test:scripts exit 1 vì scripts/ci-test-ts.test.ts"
- **actual:** bun run test:scripts → exit 0, 37 pass / 0 fail across 5 files

## S238
- **work item:** W12 — Phát hành bản cuối dưới scope cũ dạng stub rename (sóng 6)
- **cited:** Plan Tier 3 gate: pi_natives addon unbuilt ⇒ test/cli/update-cli.test.ts and test/update-cli.test.ts exit 1
- **actual:** (cd packages/coding-agent && bun test test/cli/update-cli.test.ts test/update-cli.test.ts test/cli/update-rename-migration.integration.test.ts) → 107 pass / 1 skip / 0 fail

## S239
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** python/omp-rpc/tests/test_client.py — spec §4 test contract 2 says add the ROBOMP_OMP_COMMAND override case here
- **actual:** python/omp-rpc/tests/test_client.py (exists, 1898 lines)

## S240
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** packages/utils/src/dirs.ts:24 — cited as `APP_URL` value
- **actual:** dirs.ts:24 is the doc comment `/** Public homepage that inference gateways (OpenRouter, Vercel AI Gateway) credit omp traffic to. */`

## S241
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** packages/utils/src/dirs.ts:36 — cited as `USER_AGENT` value
- **actual:** dirs.ts:36 is the doc comment `/** Default User-Agent header string (e.g. "omp/17.2.12") */`

## S242
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** package.json:135 — cited as the reason two pytest calls are chained separately
- **actual:** package.json:135 is `"pi:run": "docker run --rm -it \"${PI_IMAGE:-oh-my-pi/pi:dev}\" ."`

## S243
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** spec's total-preserving keep-set attack: "hạ test_user_group.py từ 5 xuống 0 và hạ test_sandbox.py từ 8 xuống 3 đều cho đúng tổng 20"
- **actual:** n/a — arithmetic claim about counts 5+2+2+8+3

## S244
- **work item:** W13p (section `## W13'. Hai gói Python (sóng 4)`, plan lines 4129-4358)
- **cited:** Gate 3 as the gate that catches this item's core error (spec §5: "cổng 3 là cổng bắt đúng lỗi mà item này thực sự là về")
- **actual:** Gate 3 grep over client.py, config.py, docker-compose.yml, .env.example

