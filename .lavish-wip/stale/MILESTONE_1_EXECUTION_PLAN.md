# Neo sai trong MILESTONE_1_EXECUTION_PLAN — 275 mục

Mỗi mục: `cited` (những gì tài liệu đang ghi) và `actual` (chỗ thật, đã đo).
Sửa CHỈ phần `đường/dẫn:số-dòng`. Giữ nguyên mọi văn xuôi quanh nó.

## S1
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** bun run check:types FAIL với đúng một lỗi — test/collab/w3-probe.test.ts(76,15): error TS2352
- **actual:** packages/coding-agent/test/collab/w3-probe.test.ts không tồn tại (ls: No such file; git ls-files --error-unmatch: did not match; thư mục test/collab/ không có file tên w3-probe). Tôi đã chạy thật `cd packages/coding-agent && bun run check:types` → exit 0, không một dòng lỗi nào.

## S2
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts — 41 overload on(event: "...")
- **actual:** 47 khai báo trong khoảng dòng 1301-1365. `awk 'NR>=1277' ... | rg -c '^\s*on\('` → 47, trong khi `rg -c 'on\(event: "'` → 41. 6 khai báo multi-line mở ở 1303, 1308, 1313, 1318, 1327, 1333 và đóng ở 1306, 1311, 1316, 1321, 1330, 1336.

## S3
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/hooks/types.ts — 24 overload on(event: "...")
- **actual:** 25 khai báo trong khoảng 471-500 (multi-line `session_before_compact` ở 476-479). `awk 'NR>=469' ... | rg -c '^\s*on\('` → 25, trong khi `rg -c 'on\(event: "'` → 24.

## S4
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1256 — khai báo export interface ExtensionAPI
- **actual:** sed -n '1256p' → `}` (dấu đóng của interface trước đó). rg -n 'export interface ExtensionAPI' → 1277.

## S5
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1280-1340 — khoảng chứa 41 overload
- **actual:** Khai báo `on(` đầu tiên ở dòng 1301, cuối cùng ở 1365 (`on(event: "mcp_notification", ...)`). Dòng 1280 là comment `// ======`, dòng 1340 là `turn_start` (chỉ là overload thứ 22/47).

## S6
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:636 — interface ToolDefinition
- **actual:** sed -n '636p' → ` * Tool definition for registerTool().` — đó là dòng doc comment, không phải khai báo.

## S7
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:611 — export interface ToolSessionEvent
- **actual:** sed -n '611p' → `/** Whether this is a partial/streaming result */` — dòng doc comment bên trong interface trước.

## S8
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:1696 — type alias HandlerFn
- **actual:** sed -n '1696p' → dòng doc comment về `@earendil-works/pi-coding-agent`, không phải alias.

## S9
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/hooks/loader.ts:21 — type alias HandlerFn
- **actual:** sed -n '21p' → ` */` (dòng đóng doc comment). HandlerFn ở dòng 22.

## S10
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1163 — guard `handlers && handlers.length > 0`
- **actual:** sed -n '1163p' → `}` — dấu đóng của một khối vô nghĩa ở đây.

## S11
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/extensions/runner.ts:1476/1488/1534/1596 — các điểm dispatch guard
- **actual:** Cả bốn sai. 1476 là `return onFailure?.("timeout", error);`, 1488 là `return onFailure?.("error", message);`, 1534 là `}`, 1596 là `isError: currentEvent.isError,` — không điểm nào đọc Map handler.

## S12
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/extensibility/hooks/runner.ts:173 — guard handlers && handlers.length > 0
- **actual:** sed -n '173p' → `const handlers = hook.handlers.get(eventType);` — đó là dòng lấy danh sách, guard nằm ở 174.

## S13
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/src/collab/crypto.ts đang modified, chưa commit (+42/-1) — việc W3 dở
- **actual:** git status --short packages/coding-agent/src/collab/crypto.ts → rỗng. sed -n '57p' → `return JSON.parse(TEXT_DECODER.decode(plaintext)) as CollabFrame;` — cast mù vẫn còn (việc của W3, chưa ai làm), nhưng file không modified.

## S14
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** packages/coding-agent/test/modes/warp-events.test.ts:47 — stub as unknown as ExtensionAPI
- **actual:** sed -n '47p' → `} as never as ExtensionAPI;`

## S15
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** pi-ref/.../extensions/loader.ts:256-271 — UNVERIFIABLE, path không tồn tại, đừng đi tìm
- **actual:** pi-ref là project anh em ở /Users/tranquangdang21/Projects/pi-ref (nghiên cứu chỉ chạy `find . -maxdepth 3 -name pi-ref` nên không thấy). sed -n '256,271p' cho đúng 16 dòng một `on(event: string, handler: HandlerFn): () => void` trả disposer, với assertActive() ở 257 và tầng bọc registeredHandler ở 258.

## S16
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** Bước 8 — build native addon bằng `bun --cwd=packages/natives run build`
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node đã tồn tại (185 MB). Tôi chạy thật `bun test packages/coding-agent/test/extensions-runner.test.ts` → 87 pass, 0 fail, 216 expect() calls.

## S17
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** "extensions wrap handlers" bị đánh dấu sai sự thật vì 'tham chiếu' không tồn tại
- **actual:** pi-ref có tồn tại và CÓ bọc handler (`const registeredHandler: HandlerFn = (...args) => handler(...args);` rồi `list.push(registeredHandler)`). Kết luận "omp không bọc" vẫn đúng vì extensions/loader.ts:212 là `list.push(handler);` trần và hooks/loader.ts:97 là `handlers.get(event)!.push(handler);` trần — nhưng lý do phải là vì code omp không bọc, không phải vì tham chiếu không tồn tại.

## S18
- **work item:** W1. Khôi phục disposer mà API on() của extension và hook trả về
- **cited:** "Còn 24 điểm đọc Map handler" (suy ra từ plan khi lập luận về việc không ai duyệt key)
- **actual:** rg -n 'handlers\.get\(' trên cả hai runner → 20 dòng. (Đây là số tôi tự ghi nhầm khi soạn phiếu, đã sửa lại 20 trong file sau khi đọc lại.)

## S19
- **work item:** W4. Giới hạn ACP usage vào session được yêu cầu
- **cited:** packages/coding-agent/src/session/agent-session.ts:11210 — plan mô tả đây là chữ ký `AgentSession.fetchUsageReports`
- **actual:** packages/coding-agent/src/session/agent-session.ts:11356

## S20
- **work item:** W4. Giới hạn ACP usage vào session được yêu cầu
- **cited:** HEAD là `ecd516f35b64327392329443ceb52dfbc4e08f06` trên nhánh milestone-1 (bảng "Đính chính" của plan)
- **actual:** 65cc6c181311b045a163680badee8d3a55c760cd (test(coding-agent): opt in explicitly where the suite is about parsing)

## S21
- **work item:** W4. Giới hạn ACP usage vào session được yêu cầu
- **cited:** "checkout này hoàn toàn không có node_modules — ls node_modules → No such file or directory"; `bun test` fail với `Cannot find module '@oh-my-pi/pi-agent-core'`; `bun run check:ts` chết ở `oxlint: command not found` exit 127. Plan bắt chạy `bun install` + `bun run build:native` làm tiền đề bắt buộc.
- **actual:** node_modules tồn tại (tạo 2026-09-28 07:44); baseline 78 test / 0 fail; tsgo và oxlint/oxfmt đều chạy được

## S22
- **work item:** W4. Giới hạn ACP usage vào session được yêu cầu
- **cited:** "packages/coding-agent/test/acp-agent.test.ts ... (128 KB, 3488 dòng)"
- **actual:** 3450 dòng (126 KB)

## S23
- **work item:** W4. Giới hạn ACP usage vào session được yêu cầu
- **cited:** Bảng "Đính chính" của plan: "`pi-ref/` không tồn tại trong repo này, nên các dòng được trích không thể kiểm tra và không được trích trong khối comment" — verdict "KHÔNG KIỂM CHỨNG ĐƯỢC — trích dẫn cũ"
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/server/test/conformance.test.ts:223 và :246 (502 dòng)

## S24
- **work item:** W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật
- **cited:** package.json:94 (được W5 dùng làm neo cho lệnh `bun run check:ts`)
- **actual:** Dòng 90 mới là `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types",`. Dòng 94 thật sự là `"lint:ts": "bun run --parallel lint:tools && bun run --workspaces --if-present lint",`

## S25
- **work item:** W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật
- **cited:** Vị trí lỗi đỏ kỳ vọng `test/collab/web-wire.types.ts(44,40)` trong bước cổng đỏ
- **actual:** Dòng 46, cột 40 (cột đúng, dòng sai). Khối JSDoc 25 dòng chiếm dòng 21–45 nên assertion nằm ở dòng 46. Output thật: `test/collab/web-wire.types.ts(46,40): error TS2344: Type 'false' does not satisfy the constraint 'true'.`

## S26
- **work item:** W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật
- **cited:** Khẳng định trong khối code_shape (được chép nguyên văn vào file mới): "Wire's AgentEvent declares nine turn/message/tool-execution discriminants the host never emits — agent_start, turn_start, turn_end, message_start, message_update, message_end, tool_execution_start, tool_execution_update, tool_execution_end (verified to be exactly Exclude<AgentEvent's type, AgentSessionEvent's type>)"
- **actual:** SAI HOÀN TOÀN. `Exclude<D<WireAgentEvent>, D<AgentSessionEvent>>` là `never` — KHÔNG có discriminant nào thuộc wire mà host thiếu; cả chín tên kia đều có ở host. Lý do: host `AgentSessionEvent` (packages/coding-agent/src/session/agent-session-events.ts:13) xây trên `Exclude<AgentEvent, { type: "agent_end" }>` của agent-core (packages/agent/src/types.ts:1197), không phải của wire — agent-core định nghĩa đủ cả chín.

## S27
- **work item:** W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật
- **cited:** Bước 4 của W5: mô tả dòng 379 là "arm cuối của `HostFrame`"
- **actual:** Dòng 379 là arm thứ HAI từ cuối. Arm cuối thật là dòng 380: `| { t: "error"; message: string };`

## S28
- **work item:** W5. Làm cho trích dẫn type-conformance treo lơ lửng của package wire trở nên có thật
- **cited:** Bước 1 của W5: "trong checkout này `node_modules` vắng mặt, nên cả `bun run check:ts` lẫn `bun test` đều không chạy được"
- **actual:** `node_modules/` có 243 mục; `node_modules/.bin/` chứa tsgo, oxlint, oxfmt (đều là symlink hợp lệ). Mọi cổng đã chạy được ngay.

## S29
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/ai/src/stream.ts:1209 (ANTHROPIC_CACHE_TTL_MS = 5 * 60_000)
- **actual:** KHÔNG TỒN TẠI. Dòng 1209 trống; 1208 là `return { ...options, sessionId: crypto.randomUUID() };`. `rg -rn 'ANTHROPIC_CACHE_TTL_MS' .` chỉ trúng chính các file kế hoạch, không có hit nào trong packages/.

## S30
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-context.ts:727 (chỗ gán cacheMissExplainedAt khi return)
- **actual:** dòng 741: `cacheMissExplainedAt: options?.transcript ? cacheMissExplainedAt : undefined,`. Dòng 727 là `messages.splice(i, 1);` — không liên quan.

## S31
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/agent-session-types.ts:451-477 (export interface SessionStats)
- **actual:** :472–498. Lệch 21 dòng. routedModels? ở :496, contextUsage? ở :497, đóng ở :498.

## S32
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/modes/controllers/command-controller.ts:431 (khối Cost kết thúc ở đây)
- **actual:** :428 là `}` đóng khối Cost (mở ở :415). Dòng 430 đã là `if (this.ctx.lspServers ...)`, 431 là `info += \`\n${theme.bold("LSP Servers")}\n\`;`. Chèn giữa dòng 429 (trống) và 430.

## S33
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/modes/controllers/command-controller.ts:420 (stats.cost.toFixed(4))
- **actual:** :418. Dòng 420 là `if (normalizedPremiumRequests > 0) {`.

## S34
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/modes/controllers/command-controller.ts:384 (render routedModels dùng replaceTabs + sanitizeText)
- **actual:** :383. Dòng 384 là `);` đóng `.map(`.

## S35
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/modes/controllers/command-controller.ts:380-386 (khối routedModels)
- **actual:** :379–386 — `if (stats.routedModels !== undefined) {` mở ở 379, đóng ở 386.

## S36
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/ai/src/types.ts:1130-1138 (upstreamModel)
- **actual:** :1118–1125 — doc 1118–1124, field `upstreamModel?: string;` ở 1125. Lệch 12 dòng.

## S37
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/ai/src/types.ts:1178-1198 (ToolResultMessage)
- **actual:** :1166–1186. Lệch 12 dòng.

## S38
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/agent/src/telemetry.ts:1566, 1590, 1598, 1605 (các hit responseModel)
- **actual:** Hit thật: :1589, :1613, :1621, :1629, :1672, :1716. Cả 4 số trong plan đều sai. Plan cũng nói 'chỉ trúng telemetry' — sai, còn judgment/index.ts:96, 271, 277, 441.

## S39
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-stats.ts:152-172 (lượt đi ba nguồn)
- **actual:** :150–173. Nguồn (c) nằm ở dòng 173: `for (const entry of activeModelUsageEntries(this.#host.sessionManager.getBranch())) addUsage(entry.usage);` — NGOÀI dải 152–172.

## S40
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-stats.ts:134-151 (addUsage)
- **actual:** :133–149 — khai báo ở 133, `};` ở 149. Dòng 151 là `userMessages++;` thuộc vòng lặp.

## S41
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-stats.ts:114-205 (getSessionStats)
- **actual:** :114–204. Dòng 204 là `}` đóng hàm; 205 trống.

## S42
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-entries.ts:121+ (CompactionEntry)
- **actual:** :120–137 — khai báo ở dòng 120, không phải 121.

## S43
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-entries.ts:80-91 (ModelUsageEntry)
- **actual:** :80–92 — đóng ở 92. Ngoài ra plan liệt kê `purpose, role, api, provider, model, usage, stopReason` nhưng BỎ SÓT `errorMessage?: string` ở dòng 91.

## S44
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-manager.ts:2820-2839 (appendModelUsage)
- **actual:** :2820–2841 — `return entry.id;` ở 2840, `}` ở 2841.

## S45
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-context.ts:364-378 (mảng cacheMissExplainedAt dựng ở)
- **actual:** :364–372 là trackMessageCacheState; pushMessage ở :374–378. Mảng khai báo ở :345 (`const cacheMissExplainedAt: boolean[] = [];`), không phải 364.

## S46
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/session-context.ts:375-376 (pushMessage return sớm TRƯỚC khi push)
- **actual:** Thứ tự ngược: :375 là `messages.push(msg);` rồi :376 là `if (!options?.transcript) return;` — push ở TRƯỚC, guard ở SAU.

## S47
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/model-controls.ts:634-637 (purpose: "auto-thinking")
- **actual:** :635 đúng là nơi appendModelUsage được gọi, nhưng literal "auto-thinking" KHÔNG ở đây — nó ở packages/coding-agent/src/auto-thinking/classifier.ts:144.

## S48
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/session/agent-session.ts:408 (import ./session-stats)
- **actual:** :411: `import { SessionStatsTracker, type SessionStatsTrackerHost } from "./session-stats";`. Lệch 3.

## S49
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/slash-commands/helpers/usage-report.ts:186 (sau return sớm) / :175-186 (nhánh provider-reported)
- **actual:** Nhánh đầy đủ :172–187 (mở ở 172). `return renderUsageReports(...)` ở :180–185, `}` đóng ở 186. Dòng `Cost: $...` là :200.

## S50
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/tui/src/chat/cache-invalidation-marker.ts:61 (current.cacheWrite > 0)
- **actual:** :62: `if (current.cacheWrite <= 0) return undefined;`. Lệch 1.

## S51
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/tui/src/chat/cache-invalidation-marker.ts:29-44 (doc comment giải thích implicit-cache)
- **actual:** Doc giải thích implicit-cache là :40–47; :31–38 là đoạn 'Requiring a prior warm read'. Dải 29–44 cắt ngang cả hai.

## S52
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/cli/gallery-fixtures/preview-session.ts:43 và status-line.ts:40 (object literal SessionStats buộc field phải optional)
- **actual:** Cả hai đều là `getUsageStatistics: () => ({` — thuộc UsageStatistics, KHÔNG phải SessionStats. `rg ': SessionStats\b' --type ts` trong src/ và test/ không trả về object literal SessionStats nào. Lý do 'optional' của plan sai.

## S53
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** HEAD là ecd516f
- **actual:** STALE — HEAD hiện tại là 65cc6c1 trên milestone-1 ('test(coding-agent): opt in explicitly where the suite is about parsing').

## S54
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** Verification steps: brew install ninja + bun --cwd=packages/natives run build trước khi chạy test
- **actual:** THỪA Ở CÂY HIỆN TẠI. `which ninja` → /opt/homebrew/bin/ninja; packages/natives/native/pi_natives.darwin-arm64.node đã tồn tại (185 MB); `bun test usage-statistics.test.ts` chạy được ngay: 7 pass, 0 fail.

## S55
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** packages/coding-agent/src/judgment/index.ts:78-85 (purpose judgment tự do)
- **actual:** `purpose: string;` ở :77, doc ở :76. Dải 78–85 là khối onUsage/telemetry/cache. Lệch nhẹ.

## S56
- **work item:** W9. Attribution usage theo model, với bucket `Tools/summaries`, cộng chi phí cache-miss
- **cited:** Plan nói usage của /usage lấy từ cùng nguồn với /info (phép bằng dùng chung một tổng phẳng)
- **actual:** KHÔNG CÓ tổng chung. /info dùng getSessionStats() (session-stats.ts:114–204): chỉ branch đang hoạt động, cửa sổ sau compaction/reset. /usage dùng getUsageStatistics() (session-manager.ts:2513–2515 → #index.usageSnapshot()): mọi entry từng ghi vào index qua cả branch đã bỏ (session-manager.ts:475 cộng trong insert() không lọc branch). Probe thật: model_usage ghi với parentId ngoài branch đang hoạt động → index cost = 0.5, getSessionStats() không thấy nó.

## S57
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:37
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:67

## S58
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:47
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:77

## S59
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:32-48 (read-before-writing range)
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:62-82

## S60
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:32
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:62

## S61
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:100
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:134

## S62
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:166
- **actual:** packages/coding-agent/src/extensibility/extensions/wrapper.ts:200

## S63
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/sdk.ts:1188
- **actual:** packages/coding-agent/src/sdk.ts:1200

## S64
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/sdk.ts:1205
- **actual:** packages/coding-agent/src/sdk.ts:1214

## S65
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/test/task-executor-mcp-parity.test.ts:64-80 (template to copy)
- **actual:** packages/coding-agent/test/task-executor-mcp-parity.test.ts:53-68

## S66
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** package.json:94-95 (check:tools gate)
- **actual:** package.json:91

## S67
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** package.json:93 (bun check = check:ts + check:rs)
- **actual:** package.json:89

## S68
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/providers/anthropic.ts:5453 (Anthropic strict allowlist)
- **actual:** packages/ai/src/providers/anthropic.ts:5384

## S69
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/providers/anthropic.ts:5870 (strict gate)
- **actual:** packages/ai/src/providers/anthropic.ts:5799-5803

## S70
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/providers/anthropic.ts:5869 (gate)
- **actual:** packages/ai/src/providers/anthropic.ts:5810

## S71
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/providers/anthropic.ts:5871 (keyword incompatibility check)
- **actual:** packages/ai/src/providers/anthropic.ts:5802

## S72
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/tools/bash.ts:604 (builtin strict)
- **actual:** packages/coding-agent/src/tools/bash.ts:614

## S73
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/tools/edit/index.ts:329 (builtin strict)
- **actual:** packages/coding-agent/src/edit/index.ts:329

## S74
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:611 / :636 (interface ToolDefinition)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:638

## S75
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/src/extensibility/extensions/types.ts:661 (field strict)
- **actual:** packages/coding-agent/src/extensibility/extensions/types.ts:663

## S76
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/types.ts:1438 (interface Tool)
- **actual:** packages/ai/src/types.ts:1427

## S77
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/types.ts:1443 (field strict)
- **actual:** packages/ai/src/types.ts:1432

## S78
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/utils/schema/CONSTRAINTS.md:51
- **actual:** packages/ai/src/utils/schema/CONSTRAINTS.md:52

## S79
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/src/utils/schema/CONSTRAINTS.md:56
- **actual:** packages/ai/src/utils/schema/CONSTRAINTS.md:57

## S80
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/coding-agent/test/extensions-runner.test.ts:2436 (apply_patch wire alias)
- **actual:** packages/coding-agent/test/extensions-runner.test.ts:2364

## S81
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** packages/ai/test/schema-strict-mode.test.ts:755,781 (degrade-don't-throw coverage)
- **actual:** packages/ai/test/schema-strict-mode.test.ts:742 and :768

## S82
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** git HEAD is `ecd516f` (stated in the ENVIRONMENT block and again inside W11's correction table)
- **actual:** 65cc6c1 (branch milestone-1)

## S83
- **work item:** W11. Khoá hợp đồng `strict` qua extension-tool bridge — test-only, KHÔNG port
- **cited:** "At HEAD ecd516f the native addon is NOT built, so `bun test` is red (0 pass / 1 fail, `Failed to load pi_natives native addon for darwin-arm64`); you must run `bun --cwd=packages/natives run build` (plus `brew install ninja`) before the gate is usable"
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node exists (185 MB, built Tue Sep 29 06:39:54); `bun test packages/coding-agent/test/task-executor-mcp-parity.test.ts` → 7 pass / 0 fail

## S84
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** acp-mode.ts:43-63 = isolateProtocolStdout()
- **actual:** acp-mode.ts:43-61 (dòng 62 trống, dòng 63 là function formatConsoleArgs)

## S85
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** acp-mode.ts:65-72 = formatConsoleArgs()
- **actual:** acp-mode.ts:63-71 (lệch 2 dòng)

## S86
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** acp-mode.ts:44-52 = "giữ nguyên comment giải thích"
- **actual:** Comment là :44-48. :49-52 là code (protocolStdout + stderrSink). Thêm nữa có comment thứ hai tại :56-57 ("Node's bootstrap console bound to the original stdout object…") mà work item hoàn toàn không nhắc tới

## S87
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** print-mode.ts:130-135 = comment giải thích stdoutTail
- **actual:** print-mode.ts:131-136 (dòng 130 trống)

## S88
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** print-mode.ts:130-135 — "giữ nguyên comment tại :130-135" (bước 4)
- **actual:** Work item không nhắc tới comment thứ hai tại print-mode.ts:345-347 ("Block shutdown until every serialized stdout write…"), tức comment mô tả chính drain fence mà bước 4 sắp sửa

## S89
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** packages/coding-agent/CHANGELOG.md:3 — "## [Unreleased] … đã xác minh tồn tại, hiện đang rỗng"
- **actual:** Dòng 3 đúng là "## [Unreleased]" nhưng KHÔNG rỗng: có "### Security" ở dòng 5 và 1 entry ở dòng 7. Dán ### Fixed ngay dưới dòng 3 sẽ đặt sai thứ tự

## S90
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:1680-1743 = "work item" W13; và :500-525 cho phần Wave
- **actual:** W13 thật nằm ở :3055-3283; tóm tắt Wave 2 nằm ở :453. Dải :1680-1743 là work item approval mode / bash critical patterns (bước 7-13: approval.test.ts:834, docs/approval-mode.md:64). Dải :500-525 là phần "Điều kiện tiên quyết" (bun install, build native), không liên quan W13

## S91
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** "ls -d pi-ref → không có; find . -name 'output-guard*' → rỗng. Viết tay từ đầu." (dòng "Đính chính so với plan")
- **actual:** SAI. Cả hai tồn tại: /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/output-guard.ts, 108 dòng. Chỉ sai vì tìm trong ultraworkers/ thay vì cây anh em. Nội dung file cũng khác hẳn bản work item vẽ: takeOverStdout(): void (không phải NodeJS.WriteStream), restoreStdout() là export riêng, monkey-patch process.stdout.write (không phải defineProperty trên process.stdout), writeRawStdout trả void + process.exit(1), while(true) không chặn trên, dùng new Promise + setTimeout

## S92
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** Các dòng :1691-1693, :1699-1702, :1707-1708, :1719-1724, :1730, :1691-1694 trong bảng "Đính chính so với plan"
- **actual:** Tất cả trỏ vào work item approval mode (COMPREHENSIVE:1680-1745), không phải W13. Nội dung tại các dòng đó là approval.test.ts, docs/approval-mode.md, bash.ts:515-546

## S93
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** "HEAD thật của repo này là ecd516f"
- **actual:** HEAD hôm nay là 65cc6c1 ("test(coding-agent): opt in explicitly where the suite is about parsing"), branch milestone-1

## S94
- **work item:** W13. Chống backpressure ENOBUFS cho structured stdout — gom ba cài đặt rời rạc vào một guard dùng chung
- **cited:** "cổng HIỆN KHÔNG CHẠY ĐƯỢC trong môi trường này… 0 pass / 1 fail / 1 error, Failed to load pi_natives native addon"
- **actual:** Đã build (packages/natives/native/.build/ tồn tại). bun test rpc-output.test.ts → 5 pass / 0 fail; 4 file hồi quy → 8 pass / 0 fail / 33 expect(); bun run check:ts PASS ~90s

## S95
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/coding-agent/src/exec/bash-executor.ts:17
- **actual:** packages/coding-agent/src/exec/bash-executor.ts:16

## S96
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/coding-agent/src/tools/bash.ts:38
- **actual:** packages/coding-agent/src/tools/bash.ts:26

## S97
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/utils/src/procmgr.ts:71
- **actual:** packages/utils/src/procmgr.ts:73

## S98
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/coding-agent/src/tools/index.ts:554
- **actual:** packages/coding-agent/src/tools/index.ts:561

## S99
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/coding-agent/src/tools/index.ts:557
- **actual:** packages/coding-agent/src/tools/index.ts:564

## S100
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** packages/coding-agent/src/tools/index.ts — "File 966 dòng"
- **actual:** packages/coding-agent/src/tools/index.ts — 973 dòng

## S101
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:3072-3080 (P3)
- **actual:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:4769 (bảng "Cần người quyết") và :4817 (câu hỏi "W14a còn ship không"); :454 là dòng xác nhận W14a vô điều kiện / W14b chỉ khi người dùng đồng ý

## S102
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:1746-1748
- **actual:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:1746-1748 — nội dung là comment `// Negative guard:` trong phần Hợp đồng test của W4 (approval), không liên quan PowerShell

## S103
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** profile-alias.ts:5,11,19,33 (bảng Đính chính, plan dòng 1777-1789)
- **actual:** packages/coding-agent/src/cli/profile-alias.ts:5,11,19,33 — số dòng đúng, nhưng file nằm ở src/cli/ chứ không phải src/tools/

## S104
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** Cổng hoàn thành: "ở HEAD addon vắng mặt … bun test packages/coding-agent/test/tools/ hiện cho 145 pass / 177 fail / 174 errors trên 322 tests, và mọi lỗi đều là lỗi Failed to load pi_natives native addon"; và "Điểm duy nhất không đỏ được là khi bỏ qua bước build native addon"
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node tồn tại (185 MB); bun test packages/coding-agent/test/tools/ → 2033 pass / 0 fail / 263 skip / 2296 tests / 188 files, 81.5s

## S105
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** Mục "Người dùng thấy": "…rồi chạy lệnh qua hotkey `!`, PTY tương tác, hoặc terminal của một ACP client sẽ nhận output non-ASCII đã giải mã đúng"
- **actual:** Đường PTY không chạy với PowerShell: bash-executor.ts:497-502 (`usePty`) đòi `supportsAutoUserShell`, mà hàm đó ở :338-341 chỉ nhận bash/zsh/fish; nhánh PTY ở :579-598 truyền thẳng `preflight.command` (:585) vào PtySession.startArgv (:438-443) — không quote, không guard

## S106
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** Bước 3: "thêm `isPowerShell` vào import procmgr ở dòng 17"
- **actual:** KHÔNG cần sửa — không call site nào trong bash-executor.ts gọi isPowerShell trực tiếp; buildUserShellCommand gọi helper. Import thừa làm oxlint đỏ no-unused-vars, tức đỏ cổng G1 vì lý do không liên quan hợp đồng

## S107
- **work item:** W14. Chặn encoding PowerShell trên các đường spawn của Windows (MILESTONE_1_EXECUTION_PLAN.md dòng 2866–3002) — phạm vi W14a: helper encoding + 2 spawn site; W14b bị chặn bởi câu hỏi mở 4a
- **cited:** Bảng "Đính chính so với plan": pi-ref powershell.ts "dùng ReturnType<typeof createBashTool> ở dòng 49 và 56"
- **actual:** /Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/tools/powershell.ts:52 và :59

## S108
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/coding-agent/src/modes/controllers/input-controller.ts:19
- **actual:** packages/coding-agent/src/modes/controllers/input-controller.ts:21 — line 19 is `import { AssistantMessageComponent } from "@oh-my-pi/pi-tui/chat/assistant-message";`

## S109
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/coding-agent/src/modes/controllers/input-controller.ts:319 (block `#globalEditorActionsListener` 'bắt đầu dòng 319')
- **actual:** packages/coding-agent/src/modes/controllers/input-controller.ts:321 (install assignment at :322) — line 319 is `});` closing the previous input listener

## S110
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/coding-agent/src/modes/controllers/selector-controller.ts:92 (claimed: 'import HistorySearchComponent ở :92')
- **actual:** packages/coding-agent/src/modes/controllers/selector-controller.ts:94 — line 92 is `import { listLiveToolRecords, liveToolRecordFromSession } from "@oh-my-pi/pi-tui/overlays/extensions/live-tool-session";`

## S111
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/tui/src/keybindings.ts:43 (claimed: 'member cuối tui.select.cancel ở dòng 43')
- **actual:** packages/tui/src/keybindings.ts:42 — line 43 is the `}` closing `interface Keybindings`

## S112
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/tui/src/keybindings.ts:186 (anchor of step 0, 'kiểm tra chord còn trống')
- **actual:** packages/tui/src/keybindings.ts:186 — `const code = key.charCodeAt(0);` inside `isAsciiUppercaseLetter`, unrelated to chord availability

## S113
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** packages/coding-agent/src/session/session-context.ts:214 (claimed: 'isTranscriptEntry nằm ở :214')
- **actual:** packages/coding-agent/src/session/session-context.ts:213 — line 214 is the body line `return entry.type === "message" || entry.type === "custom_message";`

## S114
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** File table: 'packages/tui/test/ chứa 235 file *.test.ts'
- **actual:** 222 — `ls packages/tui/test/*.test.ts | wc -l` and `find packages/tui/test -name '*.test.ts' | wc -l` both return 222

## S115
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** Gate 3: 'BỊ CHẶN Ở HEAD — 0 pass / 1 fail với Failed to load pi_natives native addon for darwin-arm64… tracker của milestone-1 nên coi W15 là type-complete, test-pending'
- **actual:** bun test on packages/tui PASSES: scroll-view.test.ts 13 pass/0 fail; keybindings+input 28 pass/0 fail; render-utils+autocomplete (both import @oh-my-pi/pi-natives) 119 pass/0 fail. No `brew install ninja` and no `bun --cwd=packages/natives run build` needed.

## S116
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** Corrections table: 'HEAD thực tế là ecd516f (feat: initial publish…) trên nhánh milestone-1'
- **actual:** 65cc6c1 on branch milestone-1 — `git rev-parse --short HEAD` and `git rev-parse --abbrev-ref HEAD`

## S117
- **work item:** W15. Tìm kiếm transcript trong TUI — phạm vi rendered-line-buffer
- **cited:** 'File cần chạm tới' table (9 files) — omits two files that tsgo requires
- **actual:** packages/coding-agent/src/modes/types.ts:476 (`showCopySelector(): void;` on InteractiveModeContext) and packages/coding-agent/src/modes/interactive-mode.ts:7116-7118 (delegation). Without both, `this.ctx.showTranscriptSearch()` in input-controller fails tsgo.

## S118
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** git rev-parse --short HEAD → kỳ vọng ecd516f
- **actual:** 65cc6c1 trên branch milestone-1 (git log --oneline -1 → 'test(coding-agent): opt in explicitly where the suite is about parsing')

## S119
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** packages/coding-agent/src/session/sql-session-storage.ts:277-282 và redis-session-storage.ts:116-120 — 'cả hai delegate super(backend)'
- **actual:** 277-282 và 116-120 đều là static async create(...). super(backend) thật chỉ ở sql-session-storage.ts:267; RedisSessionStorage KHÔNG có dòng super nào

## S120
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** 'grep -rn readTextSlices test/ trả hit ở memory-session-storage.test.ts và sql-session-storage.test.ts:281 nhưng KHÔNG hit nào ở redis-session-storage.test.ts'
- **actual:** Sai. redis-session-storage.test.ts có 8 hit: dòng 269, 283, và it('readTextSlices returns byte windows from the head and tail') ở dòng 416, cùng it('readTextSlices uses GETRANGE instead of GET') ở dòng 428. Ngoài ra còn hit ở test/session-listing-cache.test.ts (4 spy) và test/session-manager-close-race.test.ts

## S121
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** packages/coding-agent/src/session/redis-session-storage.ts:182-187 — 'RedisSessionStorageBackend.readSlices trả ["", ""] vì GETRANGE trên key không tồn tại', và mục Cần người quyết gọi đây là 'đường đọc thật'
- **actual:** Neo 182-187 ĐÚNG (readSlices trả Promise.all([head, tail])), nhưng hàm này không bao giờ được gọi khi path không tồn tại: IndexedSessionStorage.readTextSlices chặn trước tại indexed-session-storage.ts:281-282 với 'if (!entry) throw enoent(path);'. Probe thật: SQL và Redis đều THREW 'ENOENT: no such file'. Chỉ lộ khi index còn entry mà row backend đã mất — probe với Redis sau khi xoá key dưới index ấm thì trả ["",""]

## S122
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** Nhóm indexCoherence: 'hai lần ghi liên tiếp nhanh sinh mtimeMs tăng nghiêm ngặt' (áp dụng cho mọi backend)
- **actual:** Sai trên MemorySessionStorage. Đo thật: file strictlyIncreasing=true, indexed=true, memory=FALSE (cả hai lần ghi ra cùng mtimeMs 1790641139654). Nguyên nhân session-storage.ts:1154 createMemoryFileEntry(content, Date.now()); chỉ IndexedSessionStorage có #allocMtimeMs() cộng dồn +1 tại indexed-session-storage.ts:513-518

## S123
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** 'Một nhóm mang hình dạng crossProcessLock khẳng định rename nguyên tử sẽ fail trên Redis' (mục Cách sai dễ nhất, divergence số 1)
- **actual:** Tự mâu thuẫn: chính scoping ở bước 5 bỏ crossProcessLock trên mọi backend không phải file, nên group đó không bao giờ chạy trên Redis. Thêm nữa move là method SessionStorageBackend (indexed-session-storage.ts:48), không phải API SessionStorage — interface chỉ expose rename (session-storage.ts:157). IndexedSessionStorage.rename (indexed-session-storage.ts:362-374) cập nhật index trước rồi mới enqueue backend.move

## S124
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** Mục Xác minh: 'BLOCKED cho tới khi build native addon' + 'brew install ninja' + 'bun --cwd=packages/natives run build' + bảng cổng dòng 4312 'Cổng xanh giả — bun test chưa chạy được'
- **actual:** Đã lỗi thời. packages/natives/native/pi_natives.darwin-arm64.node tồn tại. bun test chạy được ngay: indexed-late-atomic-rollback.test.ts → 1 pass/0 fail/3 expect; 4 file có sẵn (sql/redis/durability/late-atomic) → 52 pass/0 fail/181 expect

## S125
- **work item:** W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage
- **cited:** 'Lệnh xác minh là bun check && bun test <ba file>' — bị chặn bởi môi trường, và kết luận 'cổng này CHƯA được chạy quan sát — nó được lập luận từ mã nguồn'
- **actual:** Cũng đã lỗi thời cùng mục trên. Bổ sung: lịch F1 thật sự chạy được trên SqlSessionStorage dựng từ new SQL('sqlite::memory:') — tôi đã chạy với seam client.unsafe và nó pass (backend content === B, statSync().size === 36 === bSize, writeTextSync hậu kiểm không ném)

## S126
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** pi-ref/packages/coding-agent/src/core/bug-report.ts:316-333
- **actual:** pi-ref/packages/coding-agent/src/core/bug-report.ts:282 (BUG_SUMMARY_SYSTEM_PROMPT) và :286 (BUG_SUMMARY_INSTRUCTIONS), kết thúc :300

## S127
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** pi-ref/packages/coding-agent/src/core/bug-report.ts:119-215 (collector metadata/diagnostics)
- **actual:** bug-report.ts:154-181 (collectBugReportMetadata) và :183-232 (collectBugReportDiagnostics); interface CollectBugReportMetadataOptions ở :137-152

## S128
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** pi-ref/packages/coding-agent/src/core/bug-report.ts:232-263 (danh sách file + hàm ghi archive)
- **actual:** bug-report.ts:252-272 (bugReportFiles), :274-276 (writeBugReportArchive), :278-280 (bugReportArchiveFileName)

## S129
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** pi-ref/packages/coding-agent/src/core/bug-report.ts:17-60 (redaction contract)
- **actual:** bug-report.ts:17-59; dòng 59 là `}` đóng redactJsonValue, dòng 60 là dòng trống

## S130
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** pi-ref/packages/coding-agent/src/core/crash-log.ts:47-113 (findExtensionStackMatches, ~65 dòng)
- **actual:** crash-log.ts:46-120 (75 dòng): type ở 46, normalizeStackPath ở 48, stackContainsPath ở 52, findExtensionStackMatches ở 70-120

## S131
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** packages/utils/src/dirs.ts:955 (getCrashLogPath)
- **actual:** packages/utils/src/dirs.ts:975 (thân hàm :976) — đúng ở ecd516f, đã trôi +20 dòng ở HEAD 65cc6c1

## S132
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** packages/utils/src/postmortem.ts:661 (register(id, callback))
- **actual:** packages/utils/src/postmortem.ts:673 (docblock bắt đầu 658) — đúng ở ecd516f, trôi +12 ở HEAD

## S133
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** packages/utils/src/postmortem.ts:453 (interceptUnhandledRejections)
- **actual:** packages/utils/src/postmortem.ts:465 — đúng ở ecd516f, trôi +12 ở HEAD

## S134
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** packages/coding-agent/src/slash-commands/builtin-session.ts:338-355 (mô hình /usage)
- **actual:** packages/coding-agent/src/slash-commands/builtin-session.ts:338-384; 338-355 chỉ phủ tới giữa handle, handleTui bắt đầu ở 365, đóng ở 384

## S135
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** packages/coding-agent/src/auto-thinking/classifier.ts:18 (quy ước with { type: "text" })
- **actual:** packages/coding-agent/src/auto-thinking/classifier.ts:19, 20, 21 — đúng ở ecd516f, dòng 18 ở HEAD là `import type { ModelRegistry }`

## S136
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** Môi trường: bun test bị chặn bởi pi_natives native addon thiếu (0 pass, 1 fail)
- **actual:** KHÔNG còn đúng ở HEAD 65cc6c1: packages/natives/native/pi_natives.darwin-arm64.node (185 MB, 2026-09-29 06:39) đã có; bun test memory-redaction.test.ts → 9 pass/0 fail; bash-executor.test.ts → 68 pass/0 fail; bun run check:ts xanh 15 package

## S137
- **work item:** W17. Gói bug-report đã redact + crash ring
- **cited:** Môi trường: git HEAD là ecd516f
- **actual:** HEAD là 65cc6c1 (test(coding-agent): opt in explicitly where the suite is about parsing), đã đi qua 3 commit kể từ ecd516f

## S138
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** packages/coding-agent/src/images-cli.ts (file table row, and every `images-cli.ts:N` anchor: :50, :136-145, :546)
- **actual:** packages/coding-agent/src/cli/images-cli.ts — `ls` on the plan's path returns 'No such file or directory'; `find packages -name images-cli.ts` returns exactly one match, under src/cli/

## S139
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** packages/coding-agent/src/extensibility/plugins/plugin-cli.ts (file table row, plus `plugin-cli.ts:32` and `plugin-cli.ts:672`)
- **actual:** packages/coding-agent/src/cli/plugin-cli.ts — the plan's path does not exist. Line numbers 32 and 672 are correct in the real file.

## S140
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** `ImagesDoctorResult` at `images-cli.ts:136-145`
- **actual:** packages/coding-agent/src/cli/images-cli.ts:137-143 — line 136 and 145 are both blank; the interface body is 137-143, with exitCode at 139, healthy at 141, checks at 142

## S141
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** Plan's Hình dạng code: `export interface DoctorCheck { severity; name; detail; remedy }` declared inside packages/coding-agent/src/extensibility/plugins/doctor.ts
- **actual:** packages/coding-agent/src/extensibility/plugins/types.ts:169. doctor.ts:3 imports the type, it does not define it. Re-declaring it in doctor.ts collides with the star re-exports at plugins/index.ts:3 (`export * from "./doctor"`) and :9 (`export type * from "./types"`), AND breaks the live consumer at manager.ts:969 whose test (plugin-doctor-version-drift.test.ts) is part of the 29-test green baseline.

## S142
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** Plan's stated limitation: "`bun test` does not run in this checkout until `bun --cwd=packages/natives run build`; it reports 0 pass, 1 fail with 'Failed to load pi_natives native addon for darwin-arm64'. The only gate that produces signal today is `bun run check:ts` plus the grep."
- **actual:** Stale. `bun test packages/coding-agent/test/images-cli.test.ts packages/coding-agent/test/plugin-doctor-version-drift.test.ts packages/coding-agent/test/cli-argv-routing.test.ts packages/coding-agent/test/cli-command-metadata.test.ts` → 29 pass / 0 fail. `bun -e 'import("@oh-my-pi/pi-natives")'` → OK, 128 exports. packages/natives/native/ contains built artifacts dated 2026-09-29.

## S143
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** Gate 2 and the Xác minh block: `bun run doctor` exits 1 on an error-severity check and 0 when clean
- **actual:** No `doctor` script exists in any package.json in the repo (rg '"doctor"\s*:' --glob package.json returns nothing). `bun run doctor` today fails because the script is absent, not because doctor is broken — so the gate cannot distinguish the two.

## S144
- **work item:** W18 — `omp doctor`: một lệnh chẩn đoán, hai lối ra, tự thừa nhận chỗ nó mù (GAP-M1-18)
- **cited:** Gate 1: `grep -c 'name: "doctor"' packages/coding-agent/src/cli-commands.ts` >= 1
- **actual:** Behavioural surface already exists and is exported: `isSubcommand` and `resolveCliArgv` from cli-commands.ts. Executed today: isSubcommand("doctor") === false, resolveCliArgv(["doctor"]) === {"argv":["launch","doctor"]} — the argv-to-LLM-prompt regression, proven live. The grep gate is a source-grep (which the plan itself bans) and stays green even if `load()` points at a missing module.

## S145
- **work item:** W19. GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`
- **cited:** `.oxlintrc.json` "đã có sẵn `ignorePatterns` 24 dòng" (lặp ở bảng file, bước 1, cổng 4, và bảng Đính chính)
- **actual:** .oxlintrc.json:31-58 — khối "ignorePatterns" chứa 26 phần tử, từ "**/vendor/**" (dòng 32) tới "**/*.d.ts" (dòng 57)

## S146
- **work item:** W19. GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`
- **cited:** "phần cần sửa tay sau khi các entrypoint được override là ~10 file" (bảng file cần chạm tới)
- **actual:** Không có "vị trí" — đây là ước lượng, và nó sai. Danh sách thật nằm trong §2.3 của phiếu, lấy từ `bunx oxlint .` chứ không phải từ git grep.

## S147
- **work item:** W19. GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`
- **cited:** allow-list "đúng ba nhóm entrypoint": `packages/*/src/cli/**`, `packages/*/src/commands/**`, `packages/metaharness/src/tb/cli.ts`
- **actual:** packages/stats/package.json ("bin": {"omp-stats": "./src/index.ts"}) và packages/utils/src/logger.ts:431 (`export function printTimings(): void`); phần miễn thừa: packages/coding-agent/src/cli/file-processor.ts, import bởi packages/coding-agent/src/main.ts:27, packages/coding-agent/test/block-images.test.ts:5, packages/coding-agent/test/cli/file-processor.test.ts:11

## S148
- **work item:** W19. GAP-M1-19 — Cấm `console.*` ở tầng thư viện bằng lint, thay vì bằng quy ước trong `AGENTS.md`
- **cited:** Lệnh đo: `git grep -l 'console\.\(log\|error\|warn\|info\|debug\)' -- 'packages/*/src/**/*.ts' | wc -l` → kết luận "33 file", và bước sửa tay "~10 file"
- **actual:** git ls-files cho thấy pathspec 'packages/*/src/**/*.ts' khớp 2185 file, thiếu 225 file nằm thẳng trong src/; thêm 'packages/*/src/*.ts' thì union console = 40 file (thay vì 33)

## S149
- **work item:** W20 — GAP-M1-20: Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool
- **cited:** packages/coding-agent/src/session/session-tools.ts:991 — plan ghi: `#acpPermissionDecisions.set("bash", "allow_always")` phải ghi bằng khoá đã canonicalize
- **actual:** Dòng 991 THẬT: `this.#acpPermissionDecisions.set(permissionIntent.cacheKey, "allow_always");` — không có literal "bash". `rg -n 'set\("bash"' packages/coding-agent/src/session/session-tools.ts` → exit 1, 0 hit. Chữ "bash" đến từ `cacheKey: toolName` tại acp-permission-gate.ts:55, truyền qua biến `permissionIntent.cacheKey`.

## S150
- **work item:** W20 — GAP-M1-20: Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool
- **cited:** `bash-interceptor.ts` — plan: "Dùng lại parser sẵn có của `bash-interceptor.ts` để lấy mảng lệnh đã parse cho khoá `bash`"
- **actual:** bash-interceptor.ts chỉ export MỘT symbol: `checkBashInterception` tại dòng 119, trả `InterceptionResult { block, message?, suggestedTool? }` — là quyết định chặn, KHÔNG phải mảng lệnh. Parser thật là packages/coding-agent/src/tools/shell-tokenize.ts: `extractFlatShellCommandSegments` (:369), `tokenizeShellSegments` (:14), `extractLiteralAndChainSegments` (:217), `extractLeadingCdTarget` (:501), `readShellWord` (:584). bash-interceptor.ts:8 chỉ import `extractFlatShellCommandSegments`.

## S151
- **work item:** W20 — GAP-M1-20: Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool
- **cited:** packages/coding-agent/test/tools/approval.test.ts — plan: "1.471 dòng test hiện có — không được đổi hình dạng" (lặp lại ở Cổng hoàn thành #5 và Hợp đồng test (5))
- **actual:** File thật là 959 dòng (`wc -l`). Cũng 959 ở HEAD, HEAD~1, HEAD~2, HEAD~3 — kể từ commit đầu ecd516f, chưa từng 1471. `find packages/coding-agent/test -name '*.ts' -exec wc -l` không file nào 1470/1471/1472. Nội dung file là `describe("resolveApproval tier matrix")` (:53) — ma trận 3 mode × 3 tier (:55-63), KHÔNG chạm cache ACP.

## S152
- **work item:** W20 — GAP-M1-20: Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool
- **cited:** packages/coding-agent/src/session/acp-permission-gate.ts — plan: "Bỏ `cacheKey: toolName` ở **cả bốn** nhánh" và Cổng #2: "bốn nhánh, bốn chỗ"; bước 1 liệt kê cả `edit` + loại thao tác phá hủy
- **actual:** Đúng là 4 CHỖ nhưng chỉ 3 NHÁNH: :55 (bash), :63 (delete), :70 và :75 (cùng nhánh move, hai lối return). Nhánh `edit` tại :86 đã trả `cacheKey: "edit:delete"` và :95 đã trả `cacheKey: "edit:move"` — KHÔNG dùng toolName, đã canonicalize theo lớp sẵn. `rg -c 'cacheKey: toolName'` = 4.

## S153
- **work item:** W20 — GAP-M1-20: Khoá cache `allow_always` theo hành động canonicalize, không theo tên tool
- **cited:** packages/coding-agent/test/agent-session-acp-permission.test.ts — KHÔNG được nhắc tới ở bất kỳ đâu trong work item (kể cả bảng "File cần chạm tới" và danh sách "Cách sai dễ nhất")
- **actual:** File tồn tại: 929 dòng, 30 test, tất cả xanh. Test :832 `it("allow_always: caches decision and calls bridge only once for subsequent executes")` chạy {command:"echo a"} tại :842 rồi {command:"echo b"} tại :844 và assert `expect(permissionSpy).toHaveBeenCalledTimes(1)` tại :846 — HAI lệnh KHÁC NHAU mà kỳ vọng chỉ hỏi một lần. Sau W20 hai lệnh này canonicalize ra hai khoá khác nhau ⇒ test ĐỎ. Test này đang khẳng định chính lỗ hổng W20 xoá. Đã đo: sửa :846 thành toHaveBeenCalledTimes(2) cho `Expected 2 / Received 1` (29 pass / 1 fail), rồi khôi phục, `git status` sạch. Các test cùng file :850 boundaryCases (cùng lệnh "echo boundary" hai lần), :593, :669, :720 thì sống sót vì đã dùng khoá edit:move/edit:delete khác nhau sẵn.

## S154
- **work item:** W21. Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con (GAP-M1-21)
- **cited:** `bash-executor.ts` | `sanitizeChildEnv()` dùng chung cho `Bun.spawn` và `` $`cmd` `` — (bảng "File cần chạm tới", bước 5, và Cổng hoàn thành #4)
- **actual:** packages/utils/src/env.ts:52-67 — `export function filterProcessEnv(env: Record<string, string | undefined>): Record<string, string> {`

## S155
- **work item:** W21. Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con (GAP-M1-21)
- **cited:** Bước 4: "Thêm guard `isProcessEntry`" — cùng đó là Cổng #2 và case (2) của Hợp đồng test, và mục "Cách sai dễ nhất" gọi nó là lỗi nặng nhất của item
- **actual:** packages/coding-agent/src/cli.ts:63 — `const isProcessEntry = import.meta.main || process.env.PI_COMPILED === "true";`

## S156
- **work item:** W21. Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con (GAP-M1-21)
- **cited:** "hôm nay `cli.ts` chỉ làm đúng **một** việc tiền-main: `process.title = APP_NAME` tại dòng 54" — (dòng bảng "File cần chạm tới" và dòng "Đính chính so với plan", verdict CONFIRMED)
- **actual:** packages/coding-agent/src/cli.ts:9-12 — `try {` / `	delete process.env.MallocStackLogging;` / `	delete process.env.MallocStackLoggingNoCompact;` / `} catch {}`, kèm comment ở dòng 2-8: "a child cannot suppress its own warning, so the only fix is to keep them out of the inherited env here." Ngoài ra `cli.ts:46-51` là version gate `if (Bun.semver.order(Bun.version, MIN_BUN_VERSION) < 0) { … process.exit(1); }`.

## S157
- **work item:** W21. Harden tiến trình trước main: cấm attach debugger, cấm core dump, lọc `LD_*` khỏi môi trường con (GAP-M1-21)
- **cited:** Hình dạng code: "Linux: prctl(PR_SET_DUMPABLE, 0); prctl(PR_SET_PDEATHSIG, SIGKILL); Portable: setrlimit(RLIMIT_CORE, 0); Windows: no-op sạch" — không có nhánh macOS
- **actual:** codex-rs/process-hardening/src/lib.rs:82 `#[cfg(target_os = "macos")]` → `pre_main_hardening_macos()`; dòng 88 `let ret_code = unsafe { libc::ptrace(libc::PT_DENY_ATTACH, 0, std::ptr::null_mut(), 0) };`; dòng 99 `remove_env_vars_with_prefix(b"DYLD_");`

## S158
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: "list (mặc định, nhân bản output của omp find chứ không viết lại)" — lặp lại ở "Hình dạng port", bước 3, hợp đồng test (2), cổng 2 và cổng hoàn thành #2; GAP-REGISTER-2.md:781
- **actual:** packages/coding-agent/src/cli/find-cli.ts:1-3 (`omp find`: run the semantic find tool's cascade from the shell) và :74-78 (if (!cmd.query.trim()) { console.error("Error: query is required"); process.exit(1); })

## S159
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22 + GAP-REGISTER-2.md:776: "grep -rn 'archive' packages/coding-agent/src/slash-commands/ → chỉ --archive-existing... Không có verb archive/unarchive session nào."
- **actual:** packages/coding-agent/src/commands/gc.ts:16,18 và packages/coding-agent/src/cli/gc-cli.ts:214-215 (getArchivedSessionsDir), :506-518 (archiveDestination → .gz), :656-693 (moveSessionWithArtifacts: gzip + artifacts + rollback)

## S160
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: "SessionStorageBackend.loadIndex đã trả path/size/mtime/title — đó là nguồn duy nhất" (dòng 4210 và GAP-REGISTER-2.md:783)
- **actual:** packages/coding-agent/src/session/indexed-session-storage.ts:28-30 (interface SessionStorageBackend { init(); loadIndex(): Promise<Iterable<SessionStorageIndexEntry>> }) — chỉ tồn tại trên backend indexed (SQL/Redis)

## S161
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: "Tạo commands/session.ts — Lặp khuôn commands/find.ts, ba dòng name / load / help"
- **actual:** packages/coding-agent/src/commands/find.ts — 38 dòng, là class oclif (description / args / flags / run()), KHÔNG có name / load / help

## S162
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: lý do đính chính 50→49 là "con số 50 đếm bằng grep -c 'name: \"', tức tính cả tên option lồng nhou" (dòng 4292 và GAP-REGISTER-2.md:774)
- **actual:** Không có "tên option lồng" nào trong file. Chênh lệch là entry nội bộ `__complete` tại cli-commands.ts:88 (diff giữa regex [^\"]* → 50 và [a-z0-9-]+ → 49 cho ra đúng một dòng: name: "__complete")

## S163
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: bảng "File cần chạm tới" liệt 6 file, không có packages/coding-agent/src/cli/command-help.ts
- **actual:** packages/coding-agent/test/cli-command-metadata.test.ts:30 — expect(entry.help, `${entry.name} must provide static help metadata`).toBeDefined(); (đã có sẵn trong repo)

## S164
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22: "Assertion phân tuyến dùng chung W18" đặt trong file mới packages/coding-agent/test/session/session-cli.test.ts
- **actual:** packages/coding-agent/test/cli-argv-routing.test.ts — 94 dòng, đã import { resolveCliArgv } tại dòng 12 và đã có test dispatch top-level tại dòng 59-63

## S165
- **work item:** W22 — GAP-M1-22: `omp session`: bề mặt CLI cho session, có archive/unarchive và cờ chọn mục tiêu
- **cited:** W22 giả định hình upstream có namespace 5 verb `session list|show|archive|unarchive|delete` (GAP-REGISTER-2.md:781, nguồn codex.129)
- **actual:** codex-rs/cli/src/main.rs:202-221 — enum Subcommand có Resume/Queue/Archive(SessionArchiveCommand)/Delete/…/Unarchive/Fork ở tầng cấp một; struct SessionArchiveCommand tại :376-386

## S166
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** packages/utils/src/dirs.ts:21 (và 24, 27, 36)
- **actual:** packages/utils/src/dirs.ts:22 = `export const APP_NAME: string = "omp";` · :25 = `export const APP_URL: string = "https://omp.sh/";` · :28 = `export const CONFIG_DIR_NAME: string = ".omp";` · :37 = `export const USER_AGENT = \`omp/${VERSION}\`;`

## S167
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** packages/coding-agent/src/modes/acp/acp-agent.ts:656 — kế hoạch nói đây là `name: "oh-my-pi"` và cấm sửa vì 'đó là tên package npm có scope'
- **actual:** packages/coding-agent/src/modes/acp/acp-agent.ts:656 = `name: "omp",` — CÙNG token trần với dòng 657

## S168
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** packages/coding-agent/test/acp-initialize-conformance.test.ts:233-238 — kế hoạch nói khẳng định `objectContaining({ name: "oh-my-pi", title: "omp", version: VERSION })`, và :237 là `title: "omp"`
- **actual:** packages/coding-agent/test/acp-initialize-conformance.test.ts:233-238 = `expect.objectContaining({ title: "omp", version: VERSION })` — KHÔNG có khoá `name`. `title: "omp"` nằm ở dòng 235, không phải 237.

## S169
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** packages/coding-agent/test/hindsight-bank.test.ts:82, 102, 108, 114, 136, 210, 220, 277, 278 (9 chốt khoá vàng)
- **actual:** 7 chốt thật tại 82, 95, 101, 107, 123, 191, 201 (file dài 312 dòng, nên 277/278 không vượt cuối file — chúng đơn giản là không tồn tại)

## S170
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** Cổng 5: `git grep -n '"omp"'` trên bốn file nguồn coding-agent phải không có hit nào, 'trong khi acp-agent.ts vẫn giữ name: "oh-my-pi" ở dòng 656'
- **actual:** Baseline đo được: `git grep -n '"omp"' -- .../acp-agent.ts` → 2 hit, dòng 656 và 657. Chỉ 657 được sửa.

## S171
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** Warp gate `git grep -n '"omp"' -- packages/coding-agent/src/modes/warp-events.ts` phải không có hit, kèm tuyên bố chỉ có một chốt vàng duy nhất tại warp-events.test.ts:111
- **actual:** packages/coding-agent/test/modes/warp-events.test.ts:770 — chốt vàng THỨ HAI, `agent: "omp"` trong `toEqual` của OSC `permission_request`

## S172
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** Môi trường: 'máy CHƯA build addon', 'warp-events.test.ts → 0 pass 1 fail', 'cần brew install ninja + bun --cwd=packages/natives run build'
- **actual:** packages/natives/native/pi_natives.darwin-arm64.node tồn tại (185 MB); `which ninja` → /opt/homebrew/bin/ninja; warp-events.test.ts → 24 pass 0 fail; 3 test còn lại → 42 pass 0 fail; `bun run check:ts` → exit 0

## S173
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** HEAD là 808b409fa36719c38319a041c0e612b4e702b (bảng Đính chính, dòng cuối)
- **actual:** 47720fd42c075bdd076fa1ec176dc2417325f035, branch milestone-1

## S174
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** 'Đồ thị import của dirs.ts không chạm @oh-my-pi/pi-natives' (lý do chọn packages/utils/test/ làm nơi đặt test mới)
- **actual:** packages/utils/src/dirs.ts:17 = `import { expandWindowsLongPath } from "@oh-my-pi/pi-natives/path";`

## S175
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** Bước 7: import từ '../src/dirs' 'đường dẫn tương đối, khớp với kiểu của file anh em packages/utils/test/dirs.test.ts — hãy xem dòng import của file đó và sao chép'
- **actual:** packages/utils/test/dirs.test.ts:6-14 dùng `from "@oh-my-pi/pi-utils/dirs"` — KHÔNG phải đường dẫn tương đối. Cả hai quy ước đều tồn tại; `../src/<mod>` mới là đa số (acp.test.ts:11, chalk.test.ts:2, dates.test.ts:2, dom.test.ts:4, math-delimiters.test.ts:2).

## S176
- **work item:** W1. Hằng số `WIRE_NAME` (sóng 1) — MILESTONE_5_EXECUTION_PLAN.md dòng 309–486
- **cited:** 'Wire set đúng là năm vị trí' / danh sách sáu giá trị wire bổ sung trong Cần người quyết (stencil.kdl:13, openai-codex.kdl:12, avatar.ts:50, report-tool-issue.ts:441, omp-protocol.ts:28, settings.ts:172)
- **actual:** Sáu giá trị kế hoạch nêu đều ĐÚNG (đã xác minh từng cái). NHƯNG còn thiếu 2, cùng nằm trong phạm vi grep mà kế hoạch tự nêu: packages/tui/src/terminal-capabilities.ts:1436 `const OSC99_APP_NAME = "omp";` → phát ra tại :1535 là `` `f=${base64Utf8(OSC99_APP_NAME)}` `` trong dòng meta OSC 99 tới cmux/Herdr (cùng họ với `agent` OSC 777 mà W1 CÓ đưa vào); và packages/utils/src/dirs.ts:1105 `return value ? value : "omp";` trong getAppName() → header `x-omp-app` tại packages/ai/src/providers/pi-native-client.ts:127 và `app:` tại packages/ai/src/auth-broker/remote-store.ts:1415.

## S177
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** packages/utils/src/dirs.ts:28

## S178
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:30
- **actual:** packages/utils/src/dirs.ts:31

## S179
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:114-116
- **actual:** packages/utils/src/dirs.ts:115-117

## S180
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:297-298
- **actual:** packages/utils/src/dirs.ts:307-308

## S181
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:302-305
- **actual:** packages/utils/src/dirs.ts:311-315

## S182
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:331+
- **actual:** packages/utils/src/dirs.ts:329 (class), :340 (constructor)

## S183
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:360
- **actual:** packages/utils/src/dirs.ts:370

## S184
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:384
- **actual:** packages/utils/src/dirs.ts:394

## S185
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:340-355, and the word "orphaning" at :348
- **actual:** packages/utils/src/dirs.ts:350-364, with "orphaning" at :358

## S186
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:358-372 (resolveIf)
- **actual:** packages/utils/src/dirs.ts:365-382

## S187
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:449
- **actual:** packages/utils/src/dirs.ts:459-462

## S188
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:485
- **actual:** packages/utils/src/dirs.ts:495

## S189
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:502
- **actual:** packages/utils/src/dirs.ts:512

## S190
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:541
- **actual:** packages/utils/src/dirs.ts:551

## S191
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:589-591
- **actual:** packages/utils/src/dirs.ts:598-601, body at :600

## S192
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1008
- **actual:** packages/utils/src/dirs.ts:1028

## S193
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1076
- **actual:** packages/utils/src/dirs.ts:1096

## S194
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1083-1086
- **actual:** packages/utils/src/dirs.ts:1103-1106

## S195
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1104-1152
- **actual:** packages/utils/src/dirs.ts:1124-1172, with the doc comment opening at :1110

## S196
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1155
- **actual:** packages/utils/src/dirs.ts:1175

## S197
- **work item:** W4
- **cited:** packages/utils/src/dirs.ts:1106
- **actual:** packages/utils/src/dirs.ts:1126

## S198
- **work item:** W4
- **cited:** crates/pi-natives/src/oauth_callback/darwin.rs:446
- **actual:** crates/pi-natives/src/oauth_callback/darwin.rs:444

## S199
- **work item:** W4
- **cited:** MILESTONE_5_EXECUTION_PLAN.md:13677 and :14025, as cited inside the W4 spec
- **actual:** the plan is 4808 lines, so both numbers are past EOF. The content lives in COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md at :16844 and :16934

## S200
- **work item:** W4
- **cited:** W4 spec census: 'PI_CONFIG_DIR = 69 occurrences / 26 files', reproduced by `git grep -o 'PI_CONFIG_DIR' -- . ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md'`
- **actual:** that exact command now returns 146 occurrences / 27 files. 69/26 only holds when the 8 MILESTONE_*.md plan files are excluded as well

## S201
- **work item:** W4
- **cited:** W4 spec: 'the four files W4 touches need no addon / keep the three new test files free of pi_natives'
- **actual:** packages/utils/src/dirs.ts:17 now imports { expandWindowsLongPath } from '@oh-my-pi/pi-natives/path' (added by f804d66). Still addon-free on macOS/Linux because native/path.js:14 short-circuits on process.platform === 'win32' and loadNative() is only called inside nativePathFn — but Windows CI does need the addon

## S202
- **work item:** W4
- **cited:** W4 spec step 7, which splits getBaseConfigRoot into read and write variants and implies write paths move to the new root
- **actual:** getConfigRootDir() at dirs.ts:507 returns the frozen dirs.configRoot and never calls getBaseConfigRoot() at call time, so splitting getBaseConfigRoot() does not move it. Write sites left on the legacy root: packages/ai/src/auth-broker/discover.ts:57, packages/coding-agent/src/cli/auth-broker-cli.ts:87, packages/coding-agent/src/cli/auth-gateway-cli.ts:73, packages/coding-agent/src/collab/guest.ts:449, packages/stats/src/db.ts:119. Only packages/utils/src/env.ts:289 is a read.

## S203
- **work item:** W4
- **cited:** W4 spec, which never mentions OMP_CONFIG_DIR
- **actual:** packages/utils/src/env.ts:277-282 mirrors every OMP_* key to PI_* inside parsed .env files only; git grep OMP_CONFIG_DIR returns 0 hits in code. docs/environment-variables.md:25 documents the mirror without stating the .env-only limit.

## S204
- **work item:** W4
- **cited:** W4 depends_on W3 for the new APP_NAME value
- **actual:** packages/utils/src/dirs.ts:22 still reads `export const APP_NAME: string = "omp";` — W3 is not merged, so the 'new' XDG candidate name does not exist yet and W4 cannot pick a write-root name without it

## S205
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:21
- **actual:** packages/utils/src/dirs.ts:21

## S206
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:27
- **actual:** packages/utils/src/dirs.ts:27

## S207
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:114-115
- **actual:** packages/utils/src/dirs.ts:114-115

## S208
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:355
- **actual:** packages/utils/src/dirs.ts:355

## S209
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:360
- **actual:** packages/utils/src/dirs.ts:360

## S210
- **work item:** W5
- **cited:** packages/utils/src/dirs.ts:297 (step 1 anchor)
- **actual:** packages/utils/src/dirs.ts:297

## S211
- **work item:** W5
- **cited:** packages/utils/package.json:36-39
- **actual:** packages/utils/package.json:36-39

## S212
- **work item:** W5
- **cited:** package.json:94 (step 8 anchor)
- **actual:** package.json:94

## S213
- **work item:** W5
- **cited:** packages/coding-agent/src/cli/config-cli.ts:93-101
- **actual:** packages/coding-agent/src/cli/config-cli.ts:93-101

## S214
- **work item:** W5
- **cited:** packages/coding-agent/src/cli/config-cli.ts:93 (--json branch)
- **actual:** packages/coding-agent/src/cli/config-cli.ts:93

## S215
- **work item:** W5
- **cited:** packages/tui/src/render/render-utils.ts:902
- **actual:** packages/tui/src/render/render-utils.ts:902

## S216
- **work item:** W5
- **cited:** packages/coding-agent/test/config-cli.test.ts:12-16
- **actual:** packages/coding-agent/test/config-cli.test.ts:12-16

## S217
- **work item:** W5
- **cited:** packages/coding-agent/test/config-cli.test.ts:19-28
- **actual:** packages/coding-agent/test/config-cli.test.ts:19-28

## S218
- **work item:** W9
- **cited:** packages/stats/src/aggregator.ts:130
- **actual:** packages/stats/src/aggregator.ts:142

## S219
- **work item:** W9
- **cited:** packages/stats/src/aggregator.ts:121-125 (docblock: 'zero runtime dependency on pi-coding-agent')
- **actual:** packages/stats/src/aggregator.ts:132-138 (the sentence 'keeps zero runtime dependency on `@oh-my-pi/pi-coding-agent`' is on :137)

## S220
- **work item:** W9
- **cited:** packages/stats/src/aggregator.ts:193-194 (smokeTestSyncWorker early-returns on darwin)
- **actual:** packages/stats/src/aggregator.ts:205 (function) and :206 (early return); darwin docblock at :197-201

## S221
- **work item:** W9
- **cited:** packages/stats/package.json:27 ("bin": { "omp-stats": "./src/index.ts" })
- **actual:** packages/stats/package.json:30-31 (`"bin": {` then `"omp-stats": "./src/index.ts"`)

## S222
- **work item:** W9
- **cited:** packages/coding-agent/src/cli/update-cli.ts:1135 (install classification heuristic)
- **actual:** packages/coding-agent/src/cli/update-cli.ts:1137

## S223
- **work item:** W9
- **cited:** package.json:123 (ci:test:smoke)
- **actual:** package.json:119

## S224
- **work item:** W9
- **cited:** packages/utils/src/dirs.ts:21 (APP_NAME)
- **actual:** packages/utils/src/dirs.ts:22

## S225
- **work item:** W9
- **cited:** scripts/ci-release-publish.ts:436 (the `omp-pack-` temp dir prefix that must NOT change)
- **actual:** scripts/ci-release-publish.ts:438

## S226
- **work item:** W9
- **cited:** scripts/ci-release-publish.ts:165 (described as `{ dir: "packages/omptype", kind: "typescript", publishJs: true }`)
- **actual:** scripts/ci-release-publish.ts:165 is `{ dir: "packages/utils", kind: "typescript" },`

## S227
- **work item:** W9
- **cited:** packages/coding-agent/test/worker-selector.test.ts:24,41 (the two `__omp_worker_does_not_exist` occurrences)
- **actual:** packages/coding-agent/test/worker-selector.test.ts:23, :26, :40

## S228
- **work item:** W9
- **cited:** cli.ts:36-44 (the existing `from "./cli/worker-selectors"` import block)
- **actual:** packages/coding-agent/src/cli.ts:33-42

## S229
- **work item:** W9
- **cited:** cli.ts:136-179 and cli.ts:151-179 (runSmokeTest span and its smoke calls)
- **actual:** runSmokeTest spans cli.ts:136-180 (closing brace at 180); the 14 calls are at 151,152,166,167,168,170,171,172,173,174,175,176,177,178

## S230
- **work item:** W9
- **cited:** packages/coding-agent/src/task/omp-command.ts:21-23 (the guard that keeps DEFAULT_CMD from being used)
- **actual:** packages/coding-agent/src/task/omp-command.ts:20-23 (the condition itself is on 21-22)

## S231
- **work item:** W9
- **cited:** Baseline '97 occurrences' (step 2, and the Xác minh section)
- **actual:** 91 occurrences at the correct scope; 228 when running the spec's literal commands

## S232
- **work item:** W9
- **cited:** test/eval/worker-core.test.ts has 30 occurrences
- **actual:** 24 occurrences

## S233
- **work item:** W9
- **cited:** Tier 3 is 'BỊ CHẶN trên máy chưa build native' (would need `brew install ninja` first)
- **actual:** It runs: 7 pass / 0 fail / 15 expect() calls in 1.73s; ninja is at /opt/homebrew/bin/ninja; the addon is built; `bun run ci:test:smoke` exits 0

## S234
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/worker-selector.test.ts:66 (và :87, :136, :189 cho js_eval_process)
- **actual:** :65, :86, :135, :188 — mọi neo lệch ĐÚNG 1 dòng. :66 thật là `cwd: path.resolve(__dirname, "../../.."),`

## S235
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/worker-selector.test.ts:24, :27, :41 (nhóm does_not_exist)
- **actual:** :23 `await runCli(["__omp_worker_does_not_exist"]);`, :26 assert, :40 — lệch 1 dòng cả 3

## S236
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/worker-selector.test.ts:7 (1 comment selector)
- **actual:** :6 `// The worker-host re-entry seam dispatches any `__omp_worker_*` selector to`

## S237
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/eval/worker-core.test.ts:105,113,139,140,155,165,204,205,222,232,291,292,307,325,359,360,399,414,460,461 — "20 lượt"
- **actual:** 24 lượt trên 16 dòng: :105, :115, :154, :155, :172, :182, :241, :242, :257, :275, :309, :310, :349, :364, :410, :411. File dài 584 dòng; các dòng 460/461 có tồn tại nhưng KHÔNG phải gate

## S238
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/src/modes/acp/acp-agent.ts:656 = `name: "oh-my-pi"` (khẳng định ở 3 chỗ trong đặc tả)
- **actual:** :656 là `name: "omp",`; :657 là `title: "omp",`. File KHÔNG chứa chuỗi `"oh-my-pi"` nào (chỉ có import path). Literal wire ACP thật = 6 case `_omp/…`, không phải 7

## S239
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/profile-cli.test.ts:154, :179, :205 (đã dùng APP_NAME)
- **actual:** chỉ MỘT chỗ: :144 `expect(output).not.toContain(`${APP_NAME}/${VERSION}`);` (import ở :9)

## S240
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** package.json:135 = script `test:py`
- **actual:** package.json:131 `"test:py": "python3 -m pytest -x python/omp-rpc/tests && python3 -m pytest -x python/robomp/tests",`

## S241
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** package.json:91 = script `test:scripts`
- **actual:** package.json:87

## S242
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:13809 — bằng chứng cho `name: "oh-my-pi"` phải được giao tên
- **actual:** dòng 13809 TRỐNG; 13810 là "Sáu mục thêm 2026-09-29 (`GAP-M4-10`..`GAP-M4-15`)" — không liên quan. Tài liệu đã được viết lại

## S243
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/utils/test/logger-contract.test.ts:354 (đỏ vì thiếu native addon)
- **actual:** file chỉ 337 dòng — dòng 354 vô tồn tại. `.omp` thật ở :52 `PI_CONFIG_DIR: ".omp",` và :182 `path.join(result.primaryDir, ".omp", "logs")`

## S244
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/ai/test/cursor-exec-modern.test.ts:280, :1474, :1482 (repo can1357/oh-my-pi)
- **actual:** :280, :1450, :1458

## S245
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/tools/web-search-exa.test.ts:608 (header x-exa-source)
- **actual:** :577 `expect(headers?.get("x-exa-source")).toBe("oh-my-pi");`; :608 là `{ status: 200, headers: { "Content-Type": "application/json" } }`

## S246
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** python/omp-rpc/tests/test_sandbox.py và python/omp-rpc/tests/test_worker.py
- **actual:** python/robomp/tests/test_sandbox.py (8 lượt) và python/robomp/tests/test_worker.py (3 lượt) — khác thư mục. Chỉ test_client.py + test_user_group.py mới ở python/omp-rpc/tests/

## S247
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** acp-initialize-conformance.test.ts và acp-lazy-startup.test.ts (mỗi file 1 lượt "oh-my-pi")
- **actual:** HAI file này KHÔNG còn chứa `"oh-my-pi"`. Tập thật còn 5 file / 12 lượt: git-hosting (4), zai-oauth (3), cursor-exec-modern (3), web-search-exa (1), oauth-flow (1)

## S248
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** collab/blob-broker/uploaders-legacy.ts:236
- **actual:** packages/coding-agent/src/blob-broker/uploaders-legacy.ts:236 — đường dẫn đúng, NHƯNG không có `collab/`. Nội dung dòng :236 ĐÚNG: `const body = multipartFile(request, "f", { k: apiKey, z: "omp" });`

## S249
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Baseline: 217 lượt `".omp"` trên 61 file
- **actual:** 195 lượt / 60 file (coding-agent 56, tui 2, ai 1, utils 1)

## S250
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Baseline: 200 lượt `"omp"` / 54 file
- **actual:** 199 lượt / 54 file (số file đúng, số lượt lệch 1)

## S251
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Baseline: 54 lượt `__omp_worker_` / 9 file
- **actual:** 48 lượt / 9 file (số file đúng)

## S252
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Baseline: 14 lượt `"oh-my-pi"` / 7 file
- **actual:** 12 lượt / 5 file

## S253
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Baseline: 128 file phân biệt (union 6 mẫu), 487 lượt tổng, 61+9=70
- **actual:** 126 file, 456 lượt tổng, 60+9=69. comm -12 hai tập = 0 vẫn ĐÚNG (không giao nhau)

## S254
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** packages/coding-agent/test/worker-selector.test.ts: "0 pass/1 fail/1 error trước khi build addon", phải để ở tầng 2
- **actual:** 7 pass / 0 fail — CHẠY ĐƯỢC NGAY. Nên nâng lên tầng 1. HEAD 47720fd đã build addon (commit message nói rõ)

## S255
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** logger-contract.test.ts "đỏ vì cùng lý do native addon"; packages/utils 658 pass/17 fail/16 error
- **actual:** 12 pass / 0 fail

## S256
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** bun test packages/omptype/test/ark/arrays/array.test.ts → 24 pass
- **actual:** 2 pass / 0 fail

## S257
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** "worker-host.test.ts là file test DUY NHẤT trong toàn bộ 70 file mà chạy được trên máy này"
- **actual:** sai — ít nhất 3/69 file chạy được: worker-host (4 pass), worker-selector (7 pass), logger-contract (12 pass)

## S258
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** "Đã đo bằng lệnh thật trên HEAD 1454dc0" — toàn bộ bảng số §Xác minh
- **actual:** HEAD hiện tại là 47720fd; git diff --stat 1454dc0 HEAD -- 'packages/*/test/**' = 643 files changed, 4944 insertions, 18301 deletions. Mọi số cũ phải đo lại

## S259
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Cổng 1a `bun run check:ts` được mô tả là bắt được "hằng số bị đổi sai"
- **actual:** KHÔNG. tsgo kiểm KIỂU, không kiểm GIÁ TRỊ — `APP_NAME = "ten-sai"` typecheck sạch. Đã đo: exit 0. Cổng này không đỏ được với đúng lỗi W11 sinh ra để chặn; cần canary giá trị (đã viết ở §5 của phiếu)

## S260
- **work item:** W11. Chỉ bộ test khẳng định tên về hằng số (sóng 5) — MILESTONE_5_EXECUTION_PLAN.md dòng 3526–3712
- **cited:** Cổng 1c detector chỉ kiểm "hit có disposition không"
- **actual:** GIỚI HẠN THẬT: detector hỏi "hit này có được giải thích không", KHÔNG hỏi "lý do có đúng không". Ghi reason sai vẫn xanh và test dual-read của W4 vẫn bị viết sai. Không cổng tự động nào bắt được — cần người đọc reason

## S261
- **work item:** W13
- **cited:** `.omp/**/*.md` = 9 (Xác minh mục E: `git ls-files '.omp/**/*.md' | wc -l`, và bảng `File cần chạm tới` liệt kê 9 tên file)
- **actual:** `git ls-files '.omp/**/*.md' | wc -l` = 10 tại HEAD 47720fd; 10 tên file trong đó gồm `.omp/skills/sync-squashed-fork/SKILL.md` (git ls-files '.omp/**/*.md')

## S262
- **work item:** W13
- **cited:** W13 bước 2 + Đính chính: "Trong 93 file đó đã sẵn có 2 file runtime-asset" / "chỉ 2 thật sự xuất hiện (internal-urls/omp.md và .omp/skills/semantic-compression/SKILL.md)"
- **actual:** 12 import theo đường dẫn: omp-protocol.ts:10, cfg-protocol.ts:26, system-prompt.ts:30, tools/browser/prelude-definition.ts:2, tools/jfind/index.ts:16, tools/glob.ts:9, tools/ida.ts:24, task/isolation-runner.ts:26, cleanse/agent.ts:16, commit/agentic/agent.ts:16, live/controller.ts:10, scripts/session-stats/audit.ts:45; cộng `.omp/skills/semantic-compression/SKILL.md` (dot-dir corpus, compress/index.ts:58)

## S263
- **work item:** W13
- **cited:** Xác minh: "Các con số cốt lõi dưới đây vẫn tái lập được ở HEAD hiện tại — đã chạy lại toàn bộ và nhận đúng 93 file / 549 lượt"
- **actual:** `git grep -lE "$P" -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` = 98; `... -ohE ... | wc -l` = 3284. 5 file mới: CROSS_REPO_COMPARISON.md, PACKAGE_REORGANIZATION_PLAN.md, RESEARCH_DSH_OMO_2026-09-28.md, RESEARCH_FINDINGS_2026-09-28.md, SENPI_FINDINGS.md

## S264
- **work item:** W13
- **cited:** "24 lượt URL https://github.com/can1357/oh-my-pi/... nằm trong 13 file .md" và "Cùng mẫu đó có 54 file .ts"
- **actual:** `git grep -ohE 'github\.com/[A-Za-z0-9_.-]+/oh-my-pi' -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` = 26, file = 14; `git grep -lE ... -- '*.ts' | wc -l` = 52

## S265
- **work item:** W13
- **cited:** Bước 5 + Cách sai dễ nhất mục 4: "404 lượt `.omp` trên 78 file `.md`"
- **actual:** `git grep -oh '\.omp' -- '*.md' ':!packages/*/CHANGELOG.md' ':!MILESTONE_*_EXECUTION_PLAN.md' ':!COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md' | wc -l` = 432; file = 82

## S266
- **work item:** W13
- **cited:** Đính chính: "612 file markdown được track. Lệnh: `git ls-files '*.md' | wc -l`"
- **actual:** `git ls-files '*.md' | wc -l` = 626

## S267
- **work item:** W13
- **cited:** Đính chính: "Có 14 file changelog, không phải 13" (chỉ đếm `packages/*/CHANGELOG.md`)
- **actual:** `git ls-files '*CHANGELOG.md' | grep -v '^packages/'` → `crates/vendor/napi/CHANGELOG.md`; `git ls-files '*CHANGELOG.md' | wc -l` = 15

## S268
- **work item:** W13
- **cited:** Bước 4: "10 file nhiều nhất đã đếm ở File cần chạm tới (docs/settings.md 43, README.md 36, ... docs/toolconv/hermes.md 12)"
- **actual:** `git grep -cE "$P" -- 'docs/*.md' | sort -t: -k2 -rn | head -14` cho thấy `docs/providers.md:12` ngang `docs/toolconv/hermes.md:12`

## S269
- **work item:** W13
- **cited:** Cổng hoàn thành, quy tắc A, lệnh thứ ba: `comm -23 /tmp/w13-base.txt /tmp/w13-actual.txt | wc -l  # file mang thương hiệu bị bỏ sót khỏi allow-list = ĐỎ nếu khác 0`
- **actual:** Không có vị trí đúng để sửa — công thức đếm thành công, đỏ đúng lúc W13 làm việc; Cổng hoàn thành dòng 4025

## S270
- **work item:** W13
- **cited:** Cổng hoàn thành: "**Ngưỡng allow-list (bắt buộc):** allow-list cuối cùng không được dài hơn 25 dòng"
- **actual:** Không có lệnh nào ép — Cổng hoàn thành dòng 4030

## S271
- **work item:** W13
- **cited:** Cổng hoàn thành, quy tắc C: `git diff --name-only "$BASE"...HEAD -- 'packages/*/CHANGELOG.md'`
- **actual:** Cổng hoàn thành dòng 4046; file bị bỏ sót: crates/vendor/napi/CHANGELOG.md

## S272
- **work item:** W13
- **cited:** Đính chính: "Bảng `do_not_rename` (N1–N17) ở plan dòng 13266-13282" và "Khớp N10 của bảng do_not_rename (plan dòng 13272)"
- **actual:** Quá cuối file — `sed -n '13266,13282p' MILESTONE_5_EXECUTION_PLAN.md` trả về rỗng; plan dài 4808 dòng

## S273
- **work item:** W13
- **cited:** "Đính chính: Con số 13 xuất hiện ở plan dòng 13828"
- **actual:** Quá cuối file — `sed -n '13828p'` rỗng

## S274
- **work item:** W13
- **cited:** "**W8a** — SỞ HỮU docs/extension-loading.md:231 và docs/porting-from-pi-mono.md:46-51 (plan dòng 13841)" và Đính chính "W8a (plan dòng 13841) đã nhận sở hữu"
- **actual:** Quá cuối file — `sed -n '13841p'` rỗng. Vị trí thật: MILESTONE_5_EXECUTION_PLAN.md:2342 (trong `## W8a.`, dòng 2264)

## S275
- **work item:** W13
- **cited:** Đính chính lặp lại các con trỏ "W13 dòng 13975", "13976", "13977", "13978", "13980", "13982", "13983" (đặc tả gốc của W13: 723 lượt/105 file, 603 file markdown, 79 chứa @oh-my-pi/, lệnh `bun run check`, khai báo không có test)
- **actual:** Quá cuối file — `sed -n '13975,13983p'` rỗng. Bản đính chính tương đương nằm ở dòng 4099-4115

