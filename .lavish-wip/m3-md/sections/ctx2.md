## Bối cảnh (2/2) — sổ neo đã kiểm chứng cho §3–§5

Mục này không mang lại hiệu ứng gì cho người dùng — nó là công việc nội bộ.

**Sóng / phạm vi:** context (pre-wave) — đọc bởi cả 16 mục công việc M3 trước khi bất kỳ mục nào được xếp lịch.

**Effort:** S — đọc 198 dòng plan, chạy ~30 lệnh kiểm chứng, viết sổ neo này. Nửa ngày.

**Một dòng:** Xác minh lại mọi file:line mà plan trích ở M3 §3, §4 và §5 so với cây thật, rồi đưa cho người triển khai một bảng neo đã sửa, để không ai phải mất một giờ vì một dòng cũ.

Mục "Đính chính so với plan" ở cuối tài liệu này — 17 dòng — KHÔNG phải phần phụ. Với hai mục bối cảnh (ctx1, ctx2), chính chúng là phần đính chính: 7 trong số các neo đã bị plan ghi sai đủ lớn để người đọc mở nhầm hàm.

### File cần chạm tới

| path | hành động | thay đổi | đã kiểm chứng? |
| --- | --- | --- | --- |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | sửa | Nguồn chỉ-đọc của §1 (dòng 8551), §2 (8581), §3 (8621), §4 (8644), §4.1 (8673), §5 (8685), §5.1 (8719-8741). KHÔNG bị mục này sửa — các đính chính bên dưới mới là dạng có thẩm quyền; việc gấp chúng ngược lại vào plan là một bước riêng, để sau. | có |
| `.lavish-wip/m3-specs/ctx2.spec.json` | tạo | Bản thân tài liệu này — sổ neo đã sửa và cổng kiểm chứng có thể đỏ. | có |

Ghi chú kèm theo:

- Với `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md`: đã xác nhận dòng 8549 là `# MILESTONE 3`, không phải milestone 2 như văn bản nhiệm vụ nói. `grep -n '^# MILESTONE'` trả về 299 (M1), 4173 (M2), 8549 (M3), 10564 (M6) — LƯU Ý: ở HEAD 808b365 lệnh này trả về 291/7042/9057 và file KHÔNG có header M2; commit e040a60 đã chèn kế hoạch thực thiện M2 vào, nên mọi số dòng của plan trong sổ này đã trôi.
- Với `.lavish-wip/m3-specs/ctx2.spec.json`: thư mục anh em của `m2-specs/`, vốn đã chứa sẵn 14 file `WI-N.spec.json` đúng hình dạng này.

### Các bước

1. Đọc dòng 8551-8741 của plan để lấy trong một lượt khung sóng M3 cùng §3/§4/§4.1/§5. KHÔNG đọc cả file — nó dài 1.1 MB. Neo: `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md:8551-8741`.
2. Xác nhận HEAD thật trước khi tin bất kỳ claim nào kiểu `@ HEAD 5873776` trong plan. `git rev-parse HEAD` trả về e040a60, và `git branch --show-current` trả về milestone-1. Coi mọi số dòng tương đối trong plan là chưa kiểm chứng cho tới khi tái lập được. Neo: `git rev-parse HEAD`.
3. Kiểm chứng tiền đề của §2 rằng không plugin nào chạm tới được renderer: assert `toolRenderers` là record ghi được, không đóng băng, tại `tools/index.ts:35`; bản đồ export `./*` trỏ tới `./src/*.ts`; và barrel của status-line không export `register*` nào. Cả ba đều đã xác nhận — `grep -rn register packages/tui/src/status-line/` trả về không kết quả. Neo: `packages/tui/src/tools/index.ts:35`.
4. Kiểm chứng catalog status-line đã đóng băng: đếm 27 id trong `STATUS_LINE_SEGMENT_IDS`, xác nhận `status` ở chỉ số 1 và `usage` ở chỉ số 23, và xác nhận `CUSTOM_STATUS_LINE_DEFAULTS` (`schema.ts:36-42`) chứa không cái nào trong hai cái đó. Cả ba đều đã xác nhận bằng cách đọc `schema.ts:1-42`. Neo: `packages/tui/src/status-line/schema.ts:1-42`.
5. Đọc trọn cả bảy preset và ghi lại id nào xuất hiện. Đã xác nhận: không preset nào chứa `usage`, và cũng không preset nào chứa `status` — đó chính là toàn bộ nền tảng của mối nguy hiểm width-ladder ở §4.1. Neo: `packages/tui/src/status-line/presets.ts:5,16,26,36,59,84,96`.
6. Kiểm chứng từng dòng giá trị-đảo của §3, ghi lại cho từng dòng: claim / verdict / dòng đã sửa. Khoảng một nửa số dòng trong plan lệch 1-5; hai dòng lệch 28-50; ba claim mang tính thực chất (số điểm ctrl+o, số nơi gọi keyHint, khóa schema colorblind) sai hoàn toàn. Không mang dòng nào trong số đó sang mà chưa kiểm chứng. Neo: `packages/tui/src/status-line/segments.ts:864-913`.
7. Kiểm chứng claim bằng chứng của O1 bằng cách đọc test sẵn có, chứ không đọc phần tóm tắt của plan về nó. Bằng chứng cho thấy hook status hiển thị được mà không cần segment id `status` là `makeComponent({ showHookStatus: true })` (không truyền danh sách segment nào) khẳng định hai dòng hook-status ở độ rộng 8. Neo: `packages/coding-agent/test/status-line-settings-cache.test.ts:374-381`.
8. Kiểm chứng claim về harness của §4.1: cả ba file đều tồn tại, và `packages/tui/package.json` không khai báo phụ thuộc nào vào `@oh-my-pi/pi-coding-agent`, nên một test `StatusLineComponent` thật sự không thể nằm trong `packages/tui/test/`. Đã xác nhận — các dep là omptype / pi-agent-core / pi-ai / pi-catalog / pi-natives / pi-utils / pi-wire / snapcompact. Neo: `packages/coding-agent/test/helpers/status-line.ts:6`.
9. Kiểm chứng ba dòng "must build" có rủi ro thật trong bản đồ thành phần của §4 — mouse wheel (`mouse.ts:39/46/74/87`), MCP request switch (`manager.ts:1032-1040` + capabilities ở `client.ts:101-103`), và các form class (`form.ts:104/270/352`). Mọi neo đều đã xác nhận; switch của manager thật sự ném `-32601` ở nhánh default. Neo: `packages/coding-agent/src/mcp/manager.ts:1039`.
10. Kiểm chứng seam đã khoá của O5. Xác nhận cả ba nơi tiêu thụ nằm trong `packages/tui` (`read-tool-group.ts:59`, `chat-transcript-builder.ts:443`, `:507`) và rằng hiện chưa tồn tại predicate read-collapse nào ở bất cứ đâu. Đồng thời kiểm phương án mà plan không nhắc tới: `getTool` ĐÃ nằm trong `ChatTranscriptBuilderDeps` ở `:67` và đã dùng ở `:475`, nên builder vốn đã có thể resolve một `AgentTool` theo tên. Neo: `packages/tui/src/chat/chat-transcript-builder.ts:65-77`.
11. Kiểm chứng phần kiểm kê mặt lõi của §5.1: 7 surface, trong đó 5 không có đường đăng ký nào khả dĩ, A6 là điểm tiêm duy nhất có chủ sở hữu, A9 cố ý vắng mặt. Rồi kiểm chứng các claim phủ định làm cho chúng đáng tin: `keybinding-hints.ts`, `keybindings.ts` và `app-keybindings.ts` mỗi file chứa 0 lần xuất hiện chuỗi `tmux`. Neo: `packages/tui/src/chrome/keybinding-hints.ts:57,70,78`.
12. Chạy cổng (xem mục Xác minh): đủ 63 khẳng định neo, không khẳng định nào được bỏ. Mọi khẳng định phải qua. Bất kỳ khẳng định nào hỏng nghĩa là cây đã dịch chuyển dưới sổ neo này và sổ phải được làm mới trước khi bất kỳ mục công việc M3 nào được xếp lịch. Neo: `.lavish-wip/m3-specs/ctx2.spec.json`.

### Hợp đồng test

Đây là một mục bối cảnh, nên không có hợp đồng runtime nào và không có file test nào để thêm — bịa ra một file sẽ vi phạm lệnh cấm placeholder test của AGENTS.md. Hợp đồng ở đây khác loại: **mọi neo trong sổ này phải TÁI LẬP ĐƯỢC bằng một lệnh thật**, và cổng là một script khẳng định chạy lại được (bên dưới), exit khác 0 nếu bất kỳ neo nào trôi.

Người tiêu dùng là một kỹ sư ngồi máy vào thứ Hai, sẽ gõ số dòng của plan vào trình soạn thảo. Nếu một số dòng trong sổ này sai, họ mở nhầm hàm và mất khoảng một giờ trước khi nhận ra. Nếu cổng không có khả năng đỏ, một sổ sai trông y hệt một sổ đúng. Đó là toàn bộ lý do cổng dưới đây tồn tại, và là lý do nó được viết dưới dạng khẳng định thực thi chứ không phải văn xuôi.

Điều người kỹ sư thấy nếu mục này hồi quy: họ sửa `extension-ui-controller.ts:148` mong đợi `setHeader` và rơi vào giữa `setTheme`; họ thêm `usage` vào `presets.ts` và không tìm thấy `toolRenderers`; họ đuổi theo "6 ctrl+o sites" rồi thấy 22, và tưởng cây bị hỏng thay vì nghĩ là plan sai.

Ba file test được dẫn đường trong sổ này (không sửa, không thêm):

- `packages/coding-agent/test/status-line-overflow.test.ts`
- `packages/coding-agent/test/status-line-settings-cache.test.ts`
- `packages/coding-agent/test/helpers/status-line.ts`

### Xác minh

Môi trường, đã kiểm chứng ngày 2026-09-27 tại HEAD e040a60 trên nhánh milestone-1:

```bash
bun test packages/coding-agent/test/status-line-overflow.test.ts
  -> 0 pass / 1 fail / 1 error. 'Failed to load pi_natives native addon for darwin-arm64'.
  => bun test BỊ CHẶN. Đừng đặt cổng M3 lên nó cho tới khi `bun --cwd=packages/natives run build` chạy thành công.

bun run --filter './packages/tui' --if-present check:types
  -> '@oh-my-pi/pi-tui check:types: Exited with code 0'. Cổng thay thế CHẠY ĐƯỢC mà không cần addon.
```

**CỔNG — dán khối dưới đây vào một file rồi chạy bằng bash hoặc zsh. Phải in ra 63 OK / 0 FAIL và exit 0.**

```sh
cd /Users/tranquangdang21/Projects/ultraworkers
fail=0
a(){ if [ "$2" = "$3" ]; then echo "OK   $1"; else echo "FAIL $1: want '$3' got '$2'"; fail=$((fail+1)); fi; }
a tui.ts:949          "$(sed -n '949p' packages/tui/src/tui.ts | grep -c 'setFrameProvider(provider')" 1
a composer.ts:302     "$(sed -n '302p' packages/tui/src/prompt/composer.ts | grep -c 'this.ui.setFrameProvider(this)')" 1
a frameprovider-nontest-hits "$(grep -rn 'setFrameProvider' packages/ | grep -v '/test/' | wc -l | tr -d ' ')" 2
a frameprovider-tests "$(grep -rn 'setFrameProvider' packages/ | grep '/test/' | wc -l | tr -d ' ')" 37
a tools/index.ts:35   "$(sed -n '35p' packages/tui/src/tools/index.ts | grep -c 'export const toolRenderers')" 1
a tools/index.ts:46   "$(sed -n '46p' packages/tui/src/tools/index.ts | grep -c 'grep: grepToolRenderer')" 1
a exportmap-wildcard  "$(sed -n '94,97p' packages/tui/package.json | grep -cF './src/*.ts')" 2
a segid-count         "$(awk 'NR>=3 && NR<=29 && NF' packages/tui/src/status-line/schema.ts | wc -l | tr -d ' ')" 27
a segid-status-idx    "$(awk 'NR>=3 && NR<=29 && NF{n++; if($0~/status/) print n-1}' packages/tui/src/status-line/schema.ts)" 1
a segid-usage-idx     "$(awk 'NR>=3 && NR<=29 && NF{n++; if($0~/usage/) print n-1}' packages/tui/src/status-line/schema.ts)" 23
a statusline-register "$(grep -rc 'register' packages/tui/src/status-line/ | grep -v ':0' | wc -l | tr -d ' ')" 0
a preset-default      "$(sed -n '5p' packages/tui/src/status-line/presets.ts | grep -c 'default:')" 1
a preset-minimal      "$(sed -n '16p' packages/tui/src/status-line/presets.ts | grep -c 'minimal:')" 1
a preset-compact      "$(sed -n '26p' packages/tui/src/status-line/presets.ts | grep -c 'compact:')" 1
a preset-full         "$(sed -n '36p' packages/tui/src/status-line/presets.ts | grep -c 'full:')" 1
a preset-nerd         "$(sed -n '59p' packages/tui/src/status-line/presets.ts | grep -c 'nerd:')" 1
a preset-ascii        "$(sed -n '84p' packages/tui/src/status-line/presets.ts | grep -c 'ascii:')" 1
a preset-custom       "$(sed -n '96p' packages/tui/src/status-line/presets.ts | grep -c 'custom:')" 1
a no-preset-has-usage "$(grep -c 'usage' packages/tui/src/status-line/presets.ts)" 0
a defaults-no-usage   "$(sed -n '36,42p' packages/tui/src/status-line/schema.ts | grep -c 'usage\|status')" 0
a ladder-rightpop     "$(sed -n '2705p' packages/tui/src/status-line/component.ts | grep -c 'right.pop()')" 1
a sethookstatus       "$(sed -n '959p' packages/tui/src/status-line/component.ts | grep -c 'setHookStatus(key')" 1
a hookstatus-push     "$(sed -n '3066p' packages/tui/src/status-line/component.ts | grep -c 'showHookStatus ?? true')" 1
a status-segment      "$(sed -n '197p' packages/tui/src/status-line/segments.ts | grep -c 'const statusSegment')" 1
a cachehit-formula    "$(sed -n '729p' packages/tui/src/status-line/segments.ts | grep -c 'cacheRead + cacheWrite + input')" 1
a vim-segment         "$(sed -n '804p' packages/tui/src/status-line/segments.ts | grep -c 'const vimSegment')" 1
a usage-segment-start "$(sed -n '864p' packages/tui/src/status-line/segments.ts | grep -c 'const usageSegment')" 1
a usage-segment-end   "$(sed -n '913p' packages/tui/src/status-line/segments.ts | grep -c '^};')" 1
a wheel-3-sites       "$(grep -rn 'wheel \* 3' packages/tui/src/ | wc -l | tr -d ' ')" 7
a wheel-2-sites       "$(grep -rn 'wheel \* 2' packages/tui/src/ | wc -l | tr -d ' ')" 1
a parsesgrmouse       "$(sed -n '39p' packages/tui/src/mouse.ts | grep -c 'export function parseSgrMouse')" 1
a wheel-erasure       "$(sed -n '46p' packages/tui/src/mouse.ts | grep -c 'as 1 | -1')" 1
a handlewheel-sig     "$(sed -n '74p' packages/tui/src/mouse.ts | grep -c 'handleWheel(delta: -1 | 1)')" 1
a routeselect-mouse   "$(sed -n '87p' packages/tui/src/mouse.ts | grep -c 'target.handleWheel(event.wheel)')" 1
a loader-trailer-fld  "$(sed -n '32p' packages/tui/src/components/loader.ts | grep -c '#trailer?')" 1
a loader-settrailer   "$(sed -n '141p' packages/tui/src/components/loader.ts | grep -c 'setTrailer(trailer:')" 1
a interactive-trailer "$(sed -n '6624p' packages/coding-agent/src/modes/interactive-mode.ts | grep -c 'setTrailer')" 1
a watchdog-class      "$(sed -n '57p' packages/tui/src/loop-watchdog.ts | grep -c 'export class LoopWatchdog')" 1
a watchdog-phase      "$(sed -n '123p' packages/tui/src/loop-watchdog.ts | grep -c 'takeRecentLoopPhase')" 1
a mcp-switch         "$(sed -n '1032p' packages/coding-agent/src/mcp/manager.ts | grep -c '#handleServerRequest')" 1
a mcp-throw           "$(sed -n '1039p' packages/coding-agent/src/mcp/manager.ts | grep -c '\-32601')" 1
a mcp-caps            "$(sed -n '102p' packages/coding-agent/src/mcp/client.ts | grep -c 'roots: { listChanged: false }')" 1
a readcollapse-fn     "$(sed -n '41p' packages/tui/src/chat/read-tool-group.ts | grep -c 'export function readArgsCollapseIntoGroup')" 1
a readcollapse-use    "$(sed -n '59p' packages/tui/src/chat/read-tool-group.ts | grep -c 'readArgsCollapseIntoGroup(content.arguments)')" 1
a builder-deps        "$(sed -n '65p' packages/tui/src/chat/chat-transcript-builder.ts | grep -c 'export interface ChatTranscriptBuilderDeps')" 1
a builder-ctor        "$(sed -n '101p' packages/tui/src/chat/chat-transcript-builder.ts | grep -c 'constructor(deps: ChatTranscriptBuilderDeps)')" 1
a builder-hardcode1   "$(sed -n '443p' packages/tui/src/chat/chat-transcript-builder.ts | grep -c 'content.name === "read"')" 1
a builder-hardcode2   "$(sed -n '507p' packages/tui/src/chat/chat-transcript-builder.ts | grep -c 'message.toolName === "read"')" 1
a builder-gettool     "$(sed -n '67p' packages/tui/src/chat/chat-transcript-builder.ts | grep -c 'getTool?:')" 1
a formfield           "$(sed -n '104p' packages/tui/src/components/form.ts | grep -c 'export class FormField')" 1
a textformfield       "$(sed -n '270p' packages/tui/src/components/form.ts | grep -c 'export class TextFormField')" 1
a selectformfield     "$(sed -n '352p' packages/tui/src/components/form.ts | grep -c 'export class SelectFormField')" 1
a followbottom        "$(sed -n '47p' packages/tui/src/chat/transcript-browser.ts | grep -c 'followBottom?: boolean')" 1
a noticereg           "$(sed -n '313p' packages/coding-agent/src/modes/controllers/event-controller.ts | grep -c 'notice: e => this.#handleNotice')" 1
a handlenotice        "$(sed -n '1250p' packages/coding-agent/src/modes/controllers/event-controller.ts | grep -c '#handleNotice(event')" 1
a showstatus          "$(sed -n '143p' packages/coding-agent/src/modes/utils/ui-helpers.ts | grep -c 'showStatus(message: string')" 1
a sethdr-noop         "$(sed -n '157,158p' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts | grep -c 'setFooter: () => {},')" 1
a palettes            "$(ls packages/tui/src/theme/defaults/*.json | wc -l | tr -d ' ')" 99
a tui-dep-on-agent    "$(grep -c 'pi-coding-agent' packages/tui/package.json)" 0
a overflow-test       "$(test -f packages/coding-agent/test/status-line-overflow.test.ts && echo 1 || echo 0)" 1
a plan-m3-header   "$(sed -n '8549p' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md | grep -c '^# MILESTONE 3')" 1
a plan-m3-sec3     "$(sed -n '8621p' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md | grep -c '^## 3\.')" 1
a plan-m3-sec5     "$(sed -n '8685p' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md | grep -c '^## 5\.')" 1
echo "failures: $fail"
[ "$fail" -eq 0 ]
```

### Cổng hoàn thành

Chạy nguyên văn script khẳng định trong mục Xác minh, từ thư mục gốc repo. DONE nghĩa là nó in ra `failures: 0` và exit 0 — tức cả 63 neo trong sổ này vẫn resolve đúng ký hiệu mà chúng nêu tên, tại HEAD e040a60.

Script có khả năng đỏ **theo cấu tạo, không theo ý định**: 6 trong số 63 khẳng định mang một số dòng đã sửa so với plan, và **5** trong số đó đỏ ngay nếu dùng giá trị của plan — `usage-segment-end` (913→895), `interactive-trailer` (6624→6674), `noticereg` (313→308), `handlenotice` (1250→1244), `sethdr-noop` (157,158→148,149). Nếu người triển khai thay vì tin plan và viết khẳng định từ CHÍNH plan, 5 cái đó sẽ đỏ ngay lần chạy đầu — đó là chính là điểm (đã kiểm chứng: hoán 5 trong số chúng lại về giá trị của plan cho exit 1 với đúng 5 FAIL). Còn `exportmap-wildcard` thì **không** đỏ dưới giá trị nào, vì `grep -c './src/*.ts'` trong 94-97 và trong 93-96 đều ra 2 — đừng tính nó vào bằng chứng độ đỏ. Nó cũng chẳng chứng minh được khoảng: khối thật là `package.json:94-97`, mở đầu ở 94. Cổng cũng đã bắt được nhánh drift thứ hai — số dòng trỏ vào chính `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` — qua ba khẳng định `plan-m3-header`, `plan-m3-sec3`, `plan-m3-sec5`; bằng chứng ở đoạn kế tiếp.

**Ngoài phạm vi rõ ràng** của cổng này: `bun test`, vì không chạy được (thiếu native addon). Đừng thêm cổng file test vào một mục bối cảnh — ở đây không có hành vi runtime nào để bảo vệ, và một placeholder test sẽ vi phạm AGENTS.md.

Cổng này **có thực sự đỏ được không?** Có. Bằng chứng nằm ở chính con số 6: 6 khẳng định mang số dòng đã sửa so với plan, 5 trong số đó đỏ thật dưới giá trị của plan, và bằng chứng thực nghiệm ghi lại là hoán 5 trong số chúng về giá trị của plan thì exit 1 với đúng 5 FAIL. Ba khẳng định neo plan (`plan-m3-header`, `plan-m3-sec3`, `plan-m3-sec5`) là câu trả lời cho chính nhánh drift đã làm hỏng sổ này: chúng xanh ở số của e040a60 và đỏ ở số của 808b365.

### Phụ thuộc

- `depends_on`: không — mục này đứng trước sóng, không cần gì.

- `blocks` — 16 mục sau đây, tất cả đều phải đọc sổ này trước khi được xếp lịch:
  A1 — add usage to a preset · A2 — declare the elicitation capability · A3 — mouse wheel acceleration model · A4 — plugin secret enum mask + storage · A5 — event-loop stall indicator trailer · A6 — transcript group membership predicate · A7 — transient notice buffer · A8 — tmux-aware key hints · A9 — daltonized theme palettes · B1 — tool renderer override · B2 — working-message plugin · B3 — key hint strip · C2 — shell command status segment · D1 — MCP elicitation form · D2 — cache hit-rate segment · D3 — overlay scroll chrome

### Rủi ro

Rủi ro KHÔNG phải là sổ này sai — mọi neo trong đó đã được tái lập bằng lệnh thật. Rủi ro là một mục milestone sau này (mà tôi không đọc) sẽ dựng lại cùng những claim đó từ PLAN thay vì từ file này, làm số dòng cũ quay lại (trong đó có 7 cái đủ lớn để rơi vào nhầm hàm — ví dụ `interactive-mode.ts:6674` so với :6624 thật, và dòng colorblind trỏ vào các khóa `statusLineGit*` chẳng liên quan gì tới token mà nhánh đó điều chỉnh) cùng 3 claim mang tính thực chất bị sai. ctx2 chỉ hữu dụng nếu nó là nguồn sự thật duy nhất cho các neo M3, nên bước tiếp theo là gấp các đính chính này ngược lại `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` thay vì để lại hai tài liệu mâu thuẫn.

Cái bẫy cụ thể: ba claim TRÔNG như những trượt số nhỏ nhưng không phải. (a) "6 ctrl+o sites" thật ra là 22 nơi gọi `expandKeyHint()` + 25 nơi gọi `formatExpandHint()` — đếm thiếu làm dòng đó đọc ra như "độ phủ mỏng" trong khi thực ra là bão hòa, điều có thể khiến ai đó xây một helper trùng lặp. (b) "`keyHint` không có nơi gọi nào" là sai; nó có 4, và chỉ `appKeyHint` mới chết — lý do của B3 yếu hơn plan nói. (c) dòng colorblind trích các khóa schema `statusLineGit*`, vốn không liên quan gì tới token duy nhất mà nhánh đó điều chỉnh; kỹ sư làm theo neo đó sẽ sửa nhầm phần của theme schema.

### Cần người quyết

- **M2-OQ3 (`registerStatusLineSegment`) chưa giải quyết và chặn D2 + C2**, và qua WI-7, chặn luôn hình dạng `ModeDefinition.statusLine`. GHI CHÚ: `packages/tui/test/status-line-extension-mode.test.ts`, mà plan viện dẫn là test của M2 WI-7, **KHÔNG TỒN TẠI** trong cây. Đó là một artifact tương lai bị chặn bởi câu hỏi đó — đừng đi tìm nó, và đừng để sự vắng mặt của nó bị đọc thành hồi quy.
- **O5 được đánh dấu CHỐT (locked) trong plan, nhưng tồn tại một phương án đơn giản hơn mà plan không nhắc**: `getTool?: (name: string) => AgentTool | undefined` ĐÃ nằm trong `ChatTranscriptBuilderDeps` (`chat-transcript-builder.ts:67`) và đã dùng ở `:475`, và `AgentTool` đã import được trong pi-tui từ `@oh-my-pi/pi-agent-core`. Vậy builder có thể đọc thẳng cờ membership từ tool đã resolve, thay vì phải được đưa một predicate. **Một con người phải quyết** giữ seam inject-predicate đã khoá hay mở lại nó — tôi không tự ý lật một quyết định đã khoá.
- **Dòng 21 (plugin secret lưu plaintext tại `manager.ts:942-949`) bị gate bởi M2 WI-8a** vì `manager.ts:929-957` là một dòng hotspot trong bảng của M2 và đang bị thay thế. Hãy xác nhận việc gate đó trước khi bất kỳ ai mở `manager.ts` trong M3 — nếu không, hai milestone sẽ cùng chạm vào một hàm trong cùng một sóng.
- **§4.1 nói rằng việc dựng harness thứ hai bên trong `packages/tui/test/` là "banned by this document".** Cách diễn đạt đó là lập luận riêng của plan, không phải quy tắc AGENTS.md. Sự thật nền tảng thì vững và tự đủ để giữ kết luận (`pi-tui` không có phụ thuộc `pi-coding-agent`, và `git grep pi-coding-agent` dưới `packages/tui/test/` không trả về gì), nên kết luận vẫn đứng vững mà không cần lệnh cấm bị bịa ra.

### Đính chính so với plan

| claim | verdict | correction |
| --- | --- | --- |
| Khung nhiệm vụ: "Milestone 2 chiếm dòng 7042-7692", repo ở "git HEAD 5873776". | wrong | Dòng 7042 KHÔNG còn là `# MILESTONE 3` — ở HEAD e040a60 nó là `### Phụ thuộc` giữa kế hoạch M2. `grep -n '^# MILESTONE'` trả về 299 (M1), 4173 (M2), 8549 (M3), 10564 (M6): header `# MILESTONE 2` ĐÃ tồn tại (commit e040a60 thêm kế hoạch thực thiện M2). HEAD thật là e040a60 trên nhánh milestone-1. Ghi chú lịch sử: ở HEAD 808b365 — nơi sổ này được viết — con số 291/7042/9057 và việc thiếu header M2 ĐÚNG; đính chính này đã bị chính commit e040a60 vượt qua. |
| `packages/coding-agent/src/modes/controllers/extension-ui-controller.ts:148-149` — `setHeader` và `setFooter` là no-op `() => {}`. | stale | Các no-op nằm ở :157-158, thấp hơn chín dòng. `setStatus` ở :128 (plan nói :119) và `setWorkingMessage` ở :129 (plan nói :120). Bản thân claim hoàn toàn đúng; chỉ có số dòng đã dịch chuyển. |
| omp đã phát `(ctrl+o to expand)` ở 6 điểm: `execution-shared.ts:87`, `eval.ts:680`, `eval.ts:814`, `ttsr-notification.ts:86/:117/:119`. | wrong | **SỐ ĐẾM sai rất nhiều.** Có 22 nơi gọi `expandKeyHint()` (định nghĩa tại `render/render-utils.ts:205`) cộng 25 nơi gọi `formatExpandHint()` (`render/render-utils.ts:305`) — gợi ý nằm sau một helper dùng chung và chạm tới nhiều surface hơn hẳn plan liệt kê, gồm `inspector-panel.ts` (một mình 8 điểm), `github.ts`, `lsp.ts`, `memory.ts`, `web-search.ts`. Hai trong sáu dòng trích là chính xác (`eval.ts:680`, `:814`); bốn dòng còn lại lệch 1-2 (`execution-shared.ts:89`, `ttsr-notification.ts:87`, `:118`, `:120`). **Chiều của sai số quan trọng**: omp có NHIỀU hơn thứ plan ghi công, nên hành động "không làm gì" lại càng đúng hơn. |
| `keyHint` (`keybinding-hints.ts:29`) và `appKeyHint` (:42) KHÔNG có nơi gọi nào; `rawKeyHint` (:53) đang dùng. | wrong | Hai trong ba sự thật sai. Số dòng là `keyHint` :57, `appKeyHint` :70, `rawKeyHint` :78. Và `keyHint` KHÔNG phải không có nơi gọi — nó có 4 nơi gọi (ví dụ `overlays/history-search.ts:199`). Chỉ `appKeyHint` mới thật sự chết ở 0. Tiền đề của B3 rằng "hai helper được viết ra rồi không dùng" vì vậy sai một nửa: **một** helper chết, không phải hai. |
| Các khóa git-lock của nhánh colorblind khai báo tại `packages/tui/src/theme/schema.ts:77-78` với fallback `:140-141`. | wrong | Những dòng đó là `statusLineGitClean`/`statusLineGitDirty` và không liên quan gì tới colorblind mode. Nhánh đó điều chỉnh **đúng một** token, `resolvedColors.toolDiffAdded` (`theme/loader.ts:153-157`), các khóa schema của nó là `toolDiffAdded` tại `schema.ts:53` (union) và `:116` (record defaults). Kỹ sư làm theo neo của plan sẽ sửa nhầm phần của theme schema. Bản thân claim "chỉ một token" thì ĐÚNG — phép điều chỉnh là một lệnh ghi duy nhất `resolvedColors.toolDiffAdded = adjustHsv(...)`. |
| `packages/coding-agent/src/modes/interactive-mode.ts:6674` đã cài `setTrailer(() => this.#workingRowTrailer())`. | stale | Nơi gọi thật là :6624, sớm hơn năm mươi dòng. Bản chất claim được xác nhận đầy đủ và mang tính quyết định: `loader.ts:141` `setTrailer` chỉ nhận **một** callback, nên chủ sở hữu bên coding-agent do đó buộc phải được **GỘP** với bất kỳ chỉ báo stall mới, không phải xếp chồng. Đây là dòng sắc nhất trong bảng §5.1 và neo của nó phải đúng. |
| Sự kiện notice được định tuyến tại `event-controller.ts:308` vào `#handleNotice` ở `:1244-1251`. | stale | Đăng ký nằm ở :313 (`notice: e => this.#handleNotice(e)`) và phương thức bắt đầu ở :1250. Khoảng `:1244-1251` mà plan trích thật ra **bắt đầu bên trong một phương thức khác** (`markBackgroundTaskCalls`), nên làm theo nó sẽ rơi vào sai hàm. Claim về định tuyến thì nếu không nói cách khác vẫn đúng. |
| `packages/tui/src/status-line/segments.ts:864-895` — segment usage 5 cửa sổ, đăng ký tại :865. | stale | Segment **BẮT ĐẦU** ở :864 với `id: "usage"` ở :865, đúng y như claim, nhưng nó **KẾT THÚC** ở :913, không phải :895. Mọi claim mang tính thực chất đều đứng vững: năm cửa sổ (5h/1d/7d/mo/resetCredits) cộng tier, đồng hồ reset theo từng cửa sổ, và `visible: false` khi không có cửa sổ nào. Chỉ đầu khoảng sai. |
| A4 phải sửa rò rỉ plugin secret: enum render plaintext tại `plugin-settings.ts:166` và lưu plaintext tại `manager.ts:942-949`; cờ `secret?: boolean` không có trong plan M2. | partly stale | Hai bug là thật, nhưng cách sửa nhỏ hơn nhiều so với plan ám chỉ, và cờ mà plan nói là thiếu **đã có sẵn trong cây**. `secret?: boolean` TỒN TẠI tại `packages/coding-agent/src/extensibility/plugins/types.ts:63` và `packages/tui/src/overlays/plugin-settings.ts:31`, và mặt nạ hiển thị đã được cài tại `plugin-settings.ts:152` (`schema.secret && currentValue ? "••••••••" : ...`). Vậy A4 là bản sửa **MỘT DÒNG** — nhánh enum ở :167 dùng `String(currentValue ?? schema.default ?? "")` thô thay vì dùng `displayValue` — tái sử dụng một mặt nạ vốn đã chạy được cho nhánh string ở :188. Phép grep của plan tìm "secret" trong toàn văn plan M2 trả về 0 **đã được xác nhận**, nghĩa là M2 sẽ thay kho này mà không biết cờ đã tồn tại; đó mới là rủi ro thật ở đây, chứ không phải cờ thiếu. Số dòng: enum là :167 không phải :166, nhánh string :188 không phải :187. |
| O5 đã khoá: inject một predicate `readCollapsesIntoGroup` từ coding-agent vào builder của tui, vì 3/4 nơi tiêu thụ nằm trong packages/tui vốn không thể phụ thuộc pi-coding-agent. | confirmed, with an unmentioned alternative | Lập luận về hướng phụ thuộc được xác nhận đầy đủ: `packages/tui/package.json` không khai báo phụ thuộc `@oh-my-pi/pi-coding-agent` nào (dep là omptype / pi-agent-core / pi-ai / pi-catalog / pi-natives / pi-utils / pi-wire / snapcompact) và `git grep -l pi-coding-agent -- packages/tui/test/` không trả về gì. Cả ba điểm tiêm đều tồn tại và chưa được stub: `chat-transcript-builder.ts:65-77` (interface deps, đóng ở 77 chứ không phải 76), `:101` (constructor), `:443` và `:507` (hai chỗ hardcode `=== "read"`), và `read-tool-group.ts:59`. Điều plan không nhắc: `getTool?: (name: string) => AgentTool | undefined` ĐÃ có trong deps ở :67 và đã dùng ở :475, và `AgentTool` đã được import từ `@oh-my-pi/pi-agent-core` ở :14 — nên builder vốn đã có thể resolve tool theo tên và đọc thẳng cờ membership, **không cần inject gì cả**. Tôi không lật quyết định đã khoá; điều này được nêu như một câu hỏi mở. |
| §4.1: test của A1 phải nằm ở `packages/coding-agent/test/`, không phải `packages/tui/test/`, và harness là `status-line-overflow.test.ts` cộng `StatusLineTestComponents`. | confirmed | Xác nhận đầy đủ, và đây là claim harness mang tải trọng nhất của §3-§5. Cả ba file đều tồn tại. `status-line-overflow.test.ts` đã import `resetSettingsForTest`, làm `Settings.init({ inMemory: true })`, và lấy `statusLineHost` từ coding-agent — đúng cái ràng buộc khiến một test cục bộ trong tui là bất khả thi. `StatusLineTestComponents` nằm ở `helpers/status-line.ts:6`. Một lệch 1: test bằng chứng O1 là `status-line-settings-cache.test.ts:374-381`, không phải :373-380 — khối `describe` ở 374 và khẳng định `expect(component.render(8)).toEqual(["Ponytail", "$0.04 (…"])` ở 380. Bằng chứng có tác dụng vì `makeComponent({ showHookStatus: true })` KHÔNG truyền segment id nào, và không preset nào chứa `status`, nên cả hai dòng đầu ra chứng minh hook status hiển thị qua đường riêng tại `component.ts:3066-3068` chứ không qua status segment. |
| Thang độ rộng status-line tại `component.ts:2687-2745` thu nhỏ `session_name`, rồi `right.pop()` ở :2705, rồi path, rồi loại các segment bên trái từ phải sang trái; chỉ số trong `rightSegments` là đòn bẩy ưu tiên duy nhất. | confirmed (range end understated) | **Mọi bước và mọi dòng trích đều chính xác** — cắt `session_name` tại :2688-2703, `right.pop()` tại :2705, thu nhỏ path tại :2709-2740, loại bên trái qua `leftOverflowDropIndex` tại :2752-2757. Khối thật ra chạy tới :2758, nên khoảng plan trích dừng sớm 13 dòng. Hệ quả vận hành vẫn đứng vững và là phát hiện đáng giá nhất của §3-§5: preset `default` có `rightSegments` là `["session_name"]`, nên khi nối thêm `usage` nó thành phần tử đầu tiên bị loại ở độ rộng hẹp, và vì `usage` là segment rộng nhất catalog, hạn mức biến mất lặng lẽ ở 80 cột trong khi session name (đã bị cắt) vẫn sống sót. Đó là lý do cổng của A1 phải là **hợp đồng phủ định** — usage vẫn phải hiển thị ở 80 cột với ngữ cảnh đầy đủ — chứ không phải kiểm tra dương "nó hiển thị". |
| MCP: `manager.ts:1032-1040` chỉ xử lý ping và roots/list và ném -32601 ở nhánh default; `client.ts:100-104` khai báo chỉ capability roots; `manager.ts` có một import pi-tui chỉ kiểu. | confirmed | Cả ba chính xác. `#handleServerRequest` ở :1032, `throw Object.assign(new Error(...), { code: -32601 })` ở :1039, và tham chiếu pi-tui duy nhất trong `manager.ts` là import chỉ-kiểu ở :46 — xác nhận rằng manager về mặt cấu trúc không thể mở một form. Khối capabilities là :101-103 chứ không phải :100-104 (khoảng của plan nuốt luôn `protocolVersion`), đây là một ngoặc-rộng vô hại. Dòng này đúng khi buộc D1 và A2 vào cùng một commit (O3+O4), và đúng khi cảnh báo rằng quảng bá một capability mà không có handler thì tệ hơn sự im lặng của hôm nay. |
| `acp-agent.ts:295-410` là một triển khai cục bộ đang chạy của schema→form, và cả hai vòng phản biện đều sai khi loại nó. | confirmed — plan's correction is right | Plan đúng, dossier sai. `elicitFormFromAcpClient` được khai báo tại `acp-agent.ts:314` và gọi `connection.unstable_createElicitation(...)` ở :358 — nó là một cầu nối **ĐI RA**, đóng gói một schema và hỏi một trình soạn thảo từ xa. Nó không render form cục bộ nào. Nó là tài liệu tham khảo tốt cho **vòng đời** (abort, timeout, loại response đến trễ, dọn listener) và vô dụng như tài liệu tham khảo cho schema→form rendering, đó là việc mới với D1. Đáng nói thẳng vì người đọc bỏ qua đính chính sẽ định thử tái sử dụng nó. |
| Nhóm lệch-1 nhỏ: các segment trong `schema.ts`, khoảng deps của `chat-transcript-builder.ts`, `handleScroll` của `agent-transcript-viewer.ts`, `showHookStatus` của `settings.ts`, `COLORBLIND_ADJUSTMENT` của `theme/loader.ts`, `cfgColorBlindMode` của `settings.ts`, `showStatus` của `ui-helpers.ts`, bản đồ export của `package.json`, cuối segment cacheHit, cuối segment status. | stale | Không cái nào đổi được quyết định nào, nhưng hãy mang số đã sửa: `statusSegment` 197-211 (không phải 212); `cacheHitSegment` 718-738 (không phải 737); `ChatTranscriptBuilderDeps` 65-77 (không phải 76); `#handleScroll` 517-535 (không phải 515-534) — dòng 516 là dòng cuối của doc comment, không phải dòng khai báo; `cfgStatusLineShowHookStatus` 264-267 với `default: true` ở 267 (không phải 262-265); `COLORBLIND_ADJUSTMENT` tại `theme/loader.ts:146` (không phải 145); `cfgColorBlindMode` tại `settings.ts:109` (không phải 108); `UiHelpers.showStatus` 143-164 (không phải 141-160) — thân phương thức kiểm tra hai phần tử cuối của `chatContainer` và vá tại chỗ ở :152-157, với comment "avoid log spam" ở :141, nên **BẢN CHẤT** của plan là đúng và chỉ có khoảng bị dịch; bản đồ export `./*` là `package.json:94-97` (không phải 93-96). |
| Các số đếm được xác minh chính xác và mang nguyên vẹn sang: 7 dòng preset (5,16,26,36,59,84,96), 27 segment id với status ở 1 và usage ở 23, 99 palette, 7 điểm `event.wheel * 3` + 1 điểm `* 2`, 1 nơi gọi + 1 dòng định nghĩa setFrameProvider ngoài test (tổng 2 dòng khớp, cổng đếm cả hai) với 37 hit trong test, `grep -c tmux` = 0,0,0 trên ba file, 3/4 nơi tiêu thụ read-group nằm trong tui, `form.ts:104/270/352`, `transcript-browser.ts:47`, `types.ts:235/267/264-277`, `interactive-mode.ts:424`, `grep.ts:241`, `builtin-session.ts:434`, `tmux.ts:5/48-49`, `loop-watchdog.ts:57/123-124`, `loader.ts:32/107-113/141`, `message-notice.ts:37`, `read-tool-group.ts:41`, `session-color.ts:2`, `docs/tui-core-renderer.md:107` và `:174`. | confirmed | Từng cái đều tái lập được. Hai cái đáng nói lại như mang tải trọng vì bảng §5.1 đứng trên chúng: (1) `setHeader`/`setFooter` là no-op và bề mặt plugin không thể chạm tới vùng hiển thị chính; (2) `docs/tui-core-renderer.md:107` ("The renderer never probes the user's scroll position") và `:174` ("...or forks history policy") là bất biến viết ra giới hạn cứng D3 chỉ còn ở overlay viewer. Cũng đã xác nhận: số palette đúng là 99 qua dạng glob `ls packages/tui/src/theme/defaults/*.json | wc -l`, và `MessageNoticeComponent` không có timeout, không có buffer, không có trường key — chỉ có `#expanded` và `#toolActivityVisible` — nên nó phải ở lại vĩnh viễn hiển thị và **KHÔNG** được tái dùng làm nơi chứa notice tạm thời của A7. |
| `packages/tui/test/status-line-extension-mode.test.ts` là test của M2 WI-7, không viết được cho tới khi M2-OQ3 được trả lời. | confirmed, nhưng file không tồn tại | Lập luận đúng và claim về việc bị chặn vẫn đứng vững, nhưng người đọc có thể phí công đi tìm file. `ls` xác nhận `packages/tui/test/status-line-extension-mode.test.ts` không tồn tại. Đó là một artifact tương lai bị gate bởi M2-OQ3, và sự vắng mặt của nó **KHÔNG phải** hồi quy. D2 và C2 phải được viết sau khi M2-OQ3 hạ cánh, và hợp đồng phủ định của chúng phải bắt nguồn từ hướng nào trong hai hướng của M2 được chọn — id có tiền tố bị từ chối khi gặp id trần (hướng 1), hay một map fallback nơi id chưa đăng ký vẫn được chấp nhận tại thời điểm render (hướng 2). Luận điểm của plan rằng một cơ chế thứ ba do M3 viết sẽ mâu thuẫn với bất cứ thứ gì M2 chọn là cách diễn đạt đúng và nên sống sót sang đặc tả D2/C2. |

#### Bằng chứng cho từng dòng đính chính

Theo đúng thứ tự các dòng trong bảng trên:

1. `grep -n '^# MILESTONE' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` -> 299, 4173, 8549, 10564 (ở HEAD e040a60; ở 808b365 là 291, 7042, 9057 và không có M2); `git rev-parse HEAD` -> e040a60; `git branch --show-current` -> milestone-1
2. `grep -n 'setHeader|setFooter|setStatus|setWorkingMessage' packages/coding-agent/src/modes/controllers/extension-ui-controller.ts` -> 128, 129, 157, 158
3. `grep -rn 'expandKeyHint()' packages/tui/src/ | grep -v 'export function' | wc -l` -> 22; `grep -rn 'formatExpandHint(' packages/tui/src/ | grep -v 'export function' | wc -l` -> 25 (hàm này có tham số nên mẫu phải là `formatExpandHint(` chứ không phải `formatExpandHint()`); defs tại `render/render-utils.ts:205` và `:305`
4. Số nơi gọi theo từng helper — keyHint 4, appKeyHint 0, rawKeyHint 5, editorKey 75, editorKeys 27, boundKeys 3, interruptKey 13
5. `grep -n 'toolDiffAdded' packages/tui/src/theme/schema.ts` -> 53, 116; `sed -n '77,78p;140,141p'` -> statusLineGitClean/statusLineGitDirty; `theme/loader.ts:153-157`
6. `grep -rn 'setTrailer' packages/ --include='*.ts'` -> chỉ `loader.ts:141` (định nghĩa) và `interactive-mode.ts:6624` (nơi gọi); `#workingRowTrailer` định nghĩa ở :1013
7. `grep -n 'notice:' packages/coding-agent/src/modes/controllers/event-controller.ts` -> 313; `:1250` là `async #handleNotice(event: ...)`
8. `sed -n '864,913p' packages/tui/src/status-line/segments.ts`; `^};` đầu tiên tại hoặc sau 864 nằm ở 913
9. `grep -rn 'secret' packages/coding-agent/src/extensibility/plugins/types.ts packages/tui/src/overlays/plugin-settings.ts` -> types.ts:63, plugin-settings.ts:31/152/667/668; `awk 'NR>=4000 && NR<=7041' <plan> | grep -c secret` -> 0
10. `read-tool-group.ts:41/:59`; `chat-transcript-builder.ts:14, :65-77, :101, :443, :475, :507`; `grep -c 'pi-coding-agent' packages/tui/package.json` -> 0; không có ký hiệu `readCollapsesIntoGroup` nào tồn tại trong packages/
11. `ls` xác nhận cả ba file; `status-line-settings-cache.test.ts:374-381`; `component.ts:3066-3068` = `const showHooks = this.#settings.showHookStatus ?? true`
12. `presets.ts:7` `rightSegments: ["session_name"]`; `component.ts:2687-2758`; `grep -c 'usage' packages/tui/src/status-line/presets.ts` -> 0
13. `manager.ts:1032/:1039/:46`; `client.ts:101-103`
14. `grep -n 'elicitFormFromAcpClient|unstable_createElicitation' packages/coding-agent/src/modes/acp/acp-agent.ts` -> 295 (doc), 314 (fn), 358, 389, 507, 1879
15. Mỗi cái đều được xác minh bằng `sed -n` trên file được trích; xem script cổng trong mục Xác minh cho tập con được kiểm bằng máy
16. Xem script cổng trong mục Xác minh; `docs/tui-core-renderer.md:107` và `:174` đọc trực tiếp
17. `ls packages/tui/test/status-line-extension-mode.test.ts` -> No such file or directory; `packages/tui/src/status-line/index.ts` chỉ export component/metrics/presets/segments/separators/types
