# G2 — Tổng hợp để duyệt: seam nào M2 chưa phủ

> HEAD đo được trên máy này: `d5b979ad79` (task ghi `150fd28aa9` — đó là **ông cố 3 commit**, `git merge-base --is-ancestor 150fd28aa9 HEAD` → true). Mọi neo dưới đây đo lại ở `d5b979ad79`. Không chạy `bun test`, không chạy `bun check`.

## 1. Kết luận một dòng

Dưới phương án (i), M2 đã phủ tốt các seam *cấu hình* (settings tab, freeze `toolRenderers`) nhưng bỏ sót toàn bộ seam *vòng đời và sở hữu*: bảng 50 subcommand top-level, không có `registerTheme`, các setter trạng thái UI không có chủ, và — nghiêm trọng nhất — `ExtensionUIContext.custom()` tra **nguyên instance `TUI`** cho factory plugin nên `setFrameProvider` **không bị chặn**, trong khi danh sách "core nhỏ được tin" mà WI-10 phải viết ra lại không hề nhắc tới nó; chỉ **một** seam thật sự cần đổi engine: hợp đồng render hạt-hàng không có địa chỉ ô.

## 2. Khoảng trống thật (đã loại phần M2 đã phủ)

| # | Khoảng trống | Milestone đã phủ | Bằng chứng (lệnh → kết quả @ `d5b979ad79`) | Cỡ |
|---|---|---|---|---|
| G1 | **Bảng 50 subcommand top-level đóng cứng**, không seam nào cho plugin ship `omp <verb>` | **KHÔNG** — M1 ngược lại còn *củng cố* bảng (GAP-M1-18 `doctor`, GAP-M1-22 `session`) | `grep -c 'name: "' packages/coding-agent/src/cli-commands.ts` → **50** (đầu `:29 launch`, cuối `:282 search`). Ba consumer duy nhất: `cli.ts:596`, `cli/profile-bootstrap.ts:36`, `commands/completions.ts:12`. `git grep -rn 'registerTopLevelCommand\|registerSubcommand'` → 0 hit; `pi.registerCommand` (`types.ts:1436`) chỉ ghi slash command trong session | **S** — `commands` đã là mảng export sạch, chỉ cần `registerSubcommand(entry)` + phát hiện từ manifest; mọi consumer tự đi theo |
| G2 | **Không có `registerTheme`**: plugin chỉ ghi JSON vào thư mục custom chung, và **không shadow được theme built-in** (bị bỏ qua âm thầm) | **KHÔNG** — `grep -c registerTheme` trên cả 7 `MILESTONE_*.md` + `COMPREHENSIVE_PLAN` → **0 hit ở tất cả 8 file** | `packages/tui/src/theme/loader.ts:18` `BUILTIN_THEMES`; `:64` dedupe `if (!result.some(...))` (built-in thắng); `:111` và `:127` `if (name in builtinThemes)` → `<dir>/dark.json` bị bỏ qua hoàn toàn | **XS** — một `registerTheme(name, json)` vào bucket `Extension` của WI-9 là xong |
| G3 | **Ranh giới "core nhỏ được tin" không tồn tại ở tầng kiểu**: `ctx.ui.custom` và `setEditorComponent` tra **đúng instance `TUI` thật** — có `setFrameProvider`, `injectDebugInput`, `addChild`, `stop` | **CÓ TÊN NHƯNG SAI NỘI DUNG** — WI-10 (`M2:5812`) ghim **sáu** bề mặt, không bề mặt nào là app shell/TUI handle | `types.ts:286` và `:332` nhận `tui: TUI`; `hooks/types.ts:130`; `extension-ui-controller.ts:1166` `factory(this.ctx.ui, …)`; `tui.ts:709` `export class TUI extends Container`, `:711` `#frameProvider`, `:949` `setFrameProvider` public trần, không guard | **S** — đổi `tui: TUI` thành interface hẹp ở **tầng type**, đúng tinh thần WI-16 dùng cho ranh giới TUI/ACP-vs-RPC |
| G4 | **Không có `RenderStablePrefix` như một type**: contract có một lối thoát cho in-place mutation được *hứa bằng văn bản* (JSDoc + docs + CHANGELOG đã phát hành) nhưng **không ai gọi được** | **KHÔNG** — `grep -c RenderStablePrefix` trên cả 8 file kế hoạch → **0 hit ở tất cả** | `git grep -rn RenderStablePrefix` → đúng 3 hit, **không nơi nào là định nghĩa**: `tui.ts:221` (`{@link}` trong JSDoc), `docs/tui.md:37`, `packages/tui/CHANGELOG.md:1267`. Cơ chế thật là `TranscriptStableRow` trong `chrome/transcript-container.ts`, không nằm trên `Component`, không có trên `ExtensionUiComponent` mà plugin nhận | **S** (hoặc **deletion** — gỡ JSDoc gãy cũng là một quyết định) |
| G5 | **Các setter trạng thái UI không có chủ**: `setStatus`, `setWorkingMessage`, `setTitle`, `addAutocompleteProvider` là state toàn cục | **KHÔNG** — WI-13 tường minh giới hạn phạm vi ở header/footer; 11 bucket WI-9 không bucket nào là state UI | `extension-ui-controller.ts:591-592` forward thẳng `statusLine.setHookStatus`; đích `tui/src/status-line/component.ts:508` `#hookStatuses = new Map()` phẳng, không gắn `extensionPath`. **Hiệu chỉnh so với claim:** widget cũng vậy — `#hookWidgetsAbove/#hookWidgetsBelow` (`extension-ui-controller.ts:87-88`) cùng là `Map<string, …>` phẳng key do extension tự chọn. Bất đối xứng là **có kế hoạch**, không phải có sẵn | **M** |
| G6 | **Ranh giới plugin không có hàng rào trust ở tầng module**: extension là arbitrary in-process code, nạp bằng `await import()` vào **đúng Bun process của omp**, và object `pi` mang nguyên namespace package | **ADR-only** — WI-0 là tài liệu (gate: `git diff --stat` đúng ba file markdown). Phần *thực thi* là WI-20, và `M2:44` nói thẳng "nằm ngoài M2" | `legacy-pi-compat.ts:2630` `return await import(\`${entrySpecifier}?mtime=…\`)`; `loader.ts:29` `import * as PiCodingAgent from "../../index"`, `:192` `public readonly pi: typeof PiCodingAgent`, `:451`/`:472` truyền cho **mọi** extension. Cộng `installer.ts` (194 dòng) `bun install <name>` rồi import — `grep -n 'integrity\|sha256\|checksum\|signature\|verify'` trên `installer.ts` **và** `manager.ts` → **0 hit** | **L** — và nó là **tiền đề** của M2-OQ7 (marketplace), của WI-10/WI-7/WI-11/WI-12 |
| G7 | **Mâu thuẫn cross-milestone chắc chắn sẽ đỏ**: WI-4 đóng băng `toolRenderers`, M3-B1 ghim ngược lại là writable | **HAI CHỦ TRƯƠNG ĐỐI NGHỊCH, KHÔNG CHỦ** | M2:2608/2636/2658 yêu cầu `Object.freeze<Record<string, ToolRenderer>>`. M3:1669/1693/1694 fixture gán `toolRenderers.grep` lúc runtime và ghim ba bất biến gồm "registry gán được lúc runtime". M3:258 đẩy quyết định sang "nợ bàn giao M4/M5 #4" — mà `grep -c registerToolRenderer MILESTONE_4_EXECUTION_PLAN.md MILESTONE_5_EXECUTION_PLAN.md` → **0 và 0**. Merge M2 trước M3 | **S** để *chốt*, nhưng phải chốt **trước** khi WI-4 merge |

## 3. Seam đã loại (M2 đã có chủ — không audit lại)

| Seam | Chủ | Bằng chứng |
|---|---|---|
| Panel settings (10 tab literal + `TAB_GROUPS` + thứ tự 34 domain) | **WI-8b / M2-OQ4** — coverage tốt nhất của M2 | `settings-defs.ts:4-14` union đúng 10 literal; `:20` `SETTING_TABS`; `:52` `TAB_GROUPS`; `config/all-settings.ts:44` `const DOMAINS` với **34** entry (36 namespace import). `grep -c registerSetting` → 0 hit, đúng như plan |
| `toolRenderers` writable | **WI-4** (wave 2, XS) — nhưng xem G7 | `packages/tui/src/tools/index.ts:35` `Record<string, ToolRenderer>`; 13 ref / 5 file; probe gán → 0 hit **trong repo** (backdoor là từ ngoài repo, qua export map) |
| Status-line 27 id đóng + 5 field mode hardcode | **WI-7 bước 0 / M2-OQ3** — *có chủ nhưng chưa chốt* | `schema.ts:2-30` 27 id; `segments.ts:919` `SEGMENTS: Record<StatusLineSegmentId, …>`; `grep -rn registerStatusLineSegment` → 0 hit |
| `.mcp.json` declarative ở tầng package | **đã có sẵn** — WI-12 nhắm seam *imperative runtime* còn thiếu | `discovery/omp-plugins.ts:275` `MCP_FILENAMES`; nhưng `ExtensionAPI` không có `registerMcp*` |
| `isProjectTrusted` | **WI-20** (wave 9, ngoài bàn giao M2) — `M2:44` "Phần cài enforcement là M–L, nằm ngoài M2" | `runner.ts:1293` và `session/agent-session.ts:7552` đều `isProjectTrusted: () => true` |
| `omp plugin update` | **WI-21** (wave 9) — chặn bởi GAP-M6-15 của M6 | `M2:45` "Nó là thiếu tiện nghi, không phải lỗ hổng; lỗ hổng nằm ở GAP-M6-15" |

## 4. Seam **structurally impossible** hôm nay (cần đổi engine, không phải plugin)

**Đúng một, và nó là điểm chẻm:** hợp đồng damage của TUI là hạt **một dòng vật lý**, không có địa chỉ ô.

- `Component.render(width: number): readonly string[]` — `tui.ts:240` (interface mở đầu `:224`, JSDoc `:234-239`).
- Vòng diff chỉ so và ghi **nguyên dòng**: `tui.ts:2873` `this.#providerWindow[index] === prepared.lines[index]` → `:2880-2887` viết lại qua `#lineRewriteSequence` (định nghĩa `:3443-3484`).
- Chỉ **hai** hằng erase: `ERASE_LINE = "\x1b[2K"` (`tui.ts:64`), `ERASE_TO_END_OF_LINE = "\x1b[K"` (`:65`). Không ECH/DCH/ICH.
- `git grep -rn 'damageRect' -- packages` → **0 hit toàn repo**. `grep -rni 'damage' -- 'packages/tui/src/**/*.ts'` → **0 hit**.
- Chi phí định lượng (số tôi đo lại, **không phải** con số 135/122 trong claim — không tái lập được):
  - `git grep -nE '^\s*(override )?render\(width' -- 'packages/*/src/**/*.ts' | wc -l` → **133** trên **112** file (tui 123, coding-agent 10).
  - Bốn primitive đo bề rộng ANSI: `packages/tui/src/utils.ts` — `visibleWidth:318`, `sliceWithWidth:153`, `extractSegments:182`, `sliceByColumn:716`. `visibleWidth` được gọi **391** lần trong **74** file của `tui/src`.
- **Hiệu chỉnh quan trọng so với claim gốc:** câu "không có cell buffer" của plan (`COMPREHENSIVE:165`) **sai một nửa**. Cell buffer **có** — `packages/utils/src/vterm/buffer.ts` (`CellData:17`, `BufferCell:50`, `BufferLine:136`, `BufferView:181`) — và nó **nằm trên đường render sống** qua `packages/tui/src/chat/bash-execution.ts:171 appendPtyChunk()`. Nhưng `git grep -rE 'dirty|damage|invalidate|changed' -- packages/utils/src/vterm/` → **0 hit**: lưới ô đó không có khái niệm damage, sụp về snapshot toàn hàng sau một boolean `#displayDirty` (`:61`, `:167`, `:290-291`), và nằm **ngoài** `Component`. Mệnh đề đúng phải hẹp lại: **contract của `Component` không có địa chỉ ô**, không phải "repo không có ô nào".

**Hệ quả cho option (i):** đổi sang cell/damage là đổi hợp đồng của **133 call site** + **4 primitive** → một dự án engine riêng, không phải một work item trong M2. `grep -c 'cell buffer' MILESTONE_2_EXECUTION_PLAN.md` → **1**, ngay ở dòng 100, trong preamble; không có effort, không có file, không có cổng. Danh sách "core nhỏ được tin" của plan vì thế đang **ghi tên hai hạng mục không tồn tại ở HEAD**.

## 5. Đề xuất milestone mới

**Tên: `M2.5 — Trust & Ownership Boundaries`** (đứng giữa M2 và M3, vì M3 đang bị gate bởi M2).

| Hạng mục | Nội dung | Cỡ |
|---|---|---|
| **WI-A** | **Cắt bảng 50 subcommand** thành registry: `registerSubcommand(entry)` + discovery từ plugin manifest; `cli.ts:596`, `profile-bootstrap.ts:36`, `completions.ts:12` tự đi theo | S |
| **WI-B** | **Thu hẹp handle TUI ở tầng type**: `types.ts:286`, `:332`, `hooks/types.ts:130` đổi `tui: TUI` → interface hẹn (`requestRender` / `setFocus` / `showOverlay` / đọc theme). Không phải sandbox — là **ràng buộc biên compile** | S |
| **WI-C** | **Chốt mâu thuẫn `toolRenderers`** *trước khi WI-4 merge*: plugin có được sở hữu renderer của built-in không? Câu trả lời phải là một trong hai, và B1 của M3 phải theo | S |
| **WI-D** | **`registerTheme(name, json)`** + provenance theo plugin + chính sách shadow built-in | XS |
| **WI-E** | **Sở hữu trạng thái UI**: namespace key theo `extensionPath` cho `#hookStatuses` (`status-line/component.ts:508`) và `#hookWidgetsAbove/Below` (`extension-ui-controller.ts:87-88`); trả lại tài nguyên khi unload | M |
| **WI-F** | **Chốt `RenderStablePrefix`**: hoặc định nghĩa interface trên `Component`, hoặc gỡ JSDoc/docs/CHANGELOG đã phát hành. Hiện đang hứa một escape hatch không tồn tại | S |

**Vì sao nó phục vụ mục tiêu:** slogan "mọi thứ là plugin" chỉ đúng nghĩa đen khi (a) plugin thật sự có thể chiếm surface CLI và theme, (b) core nhỏ được tin được **cưỡng chế bằng kiểu** chứ không bằng thói quen, và (c) extension không giữ tài nguyên của nhau. WI-F là hạng mục nhỏ nhất mà bỏ thì plan đang nói dối người đọc tài liệu.

## 6. Việc phải làm tiếp theo (theo thứ tự, có chủ)

1. **Owner chốt WI-C** (`toolRenderers`) — **trước khi WI-4 merge**. Đây là lỗi đỏ chắc chắn, không phải rủi ro lịch trình. Không có việc khác nào trong danh sách này chặn được nó.
2. **Owner sửa WI-10 (`M2:5812`)**: thêm dòng thứ bảy đánh dấu `CORE-ONLY` cho app shell + thêm câu hỏi thứ tư vào cổng hoàn thành ("những gì ở lại trong core là gì"). Hiện `awk` ở `M2:6040` chỉ đòi `rows == marked`, nên một ADR không nhắc `setFrameProvider` vẫn **xanh cổng**.
3. **Owner đính chính `COMPREHENSIVE:165`**: bỏ mệnh đề "không có cell buffer" (sai — `packages/utils/src/vterm/buffer.ts` có và nằm trên đường sống), thay bằng "contract của `Component` không có địa chỉ ô; lưới ô duy nhất (`vterm`) nằm ngoài contract và không có khái niệm damage". Danh sách core phải ghi tên thứ **tồn tại**, không ghi tên thứ bịa.
4. **Owner giao WI-A** (`registerSubcommand`) — rẻ nhất, ba consumer tự đi theo.
5. **Owner giao WI-B** (thu hẹp `tui: TUI`) — vá đúng tinh thần, và là câu trả lời cho câu hỏi tự quyết mà plan đang để mở.
6. **Chốt M2-OQ3** (status-line segment) — `M2:4018` nói "cố ý KHÔNG chọn"; nó đang chặn WI-7 step 6 **và** D2/C2 của M3 (hàng 8 bảng gate M3:3058).

## 7. Điều CHƯA biết

1. **Không có runtime nào được xác nhận.** `bun test` không chạy được trên máy này; tôi không xác nhận được rằng một plugin gọi `tui.setFrameProvider(...)` **thực sự** chiếm được app shell lúc chạy. Tôi chỉ xác nhận được đường gọi có kiểu và không guard. Vá rẻ nhất nếu owner muốn: đổi tham số `tui` thành interface hẹn và xem `tsgo` gãy ở đâu.
2. **Sáu reference checkout trong task đều vắng** (`pi-ref`, `gajae-ref`, `codex-ref`, `opencode-ref`, `claude-code-ref`). Không so sánh được với sản phẩm nào. Ba cái có thật tôi **không mở file nào**. Mọi phán đoán "nên là plugin seam" ở đây suy ra từ slogan + từ câu hỏi quyết định của chính plan.
3. **Đã sweep** `packages/coding-agent/src` (đủ sâu) và `packages/tui/src` (render/frame/status-line/settings). **Chưa sweep** `packages/stats`, `packages/metaharness`, `packages/collack-web`, `packages/browser-relay`, `crates/pi-natives`, và không đọc `modes/acp/` hay `modes/rpc/` ngoài đúng một site mà WI-13 đã nêu. `metaharness` là chỗ hợp lý nhất có thể chứa một lớp cô lập mà tôi nói là không tồn tại — cần một lượt sweep riêng trước khi dùng G6 làm tiền đề quyết định.
4. **M2-OQ2** (capability registry có extension-reachable không) và **M2-OQ3** đều chưa có câu trả lời. Tôi không suy diễn YES/NO/DEFERRED cho bất kỳ câu nào.
5. **Drift số liệu so với plan** (đo lại ở HEAD, không sửa tài liệu): `render(width)` **133/112** chứ không phải 135/122; `visibleWidth` **391/74** chứ không phải 335/78; `DOMAINS` **34** entry chứ không phải 37; `toolRenderers` **13** ref chứ không phải 14 (`M2:2772` ghi 14); bảng flag **31+2+31 = 64** chứ không phải 32+3+25 = 60; `#frameProvider` được đọc ở **5** site (`:1755 :1942 :2152 :2658 :2707`) chứ không phải 4.
6. **Chưa đọc** `plugins/parser.ts` để kiểm manifest có khai báo theme không. Nếu có, G2 sai — đây là rủi ro lớn nhất trong danh sách.
7. **Chưa kiểm `crates/`** cho tầng damage cấp Rust. Mệnh đề "cần đổi engine" ở §4 chỉ khẳng định cho tầng TypeScript của `packages/*/src`.
8. **Đã bỏ có chủ ý** (M2 đã phủ, không cần audit lại): thứ tự nạp extension (WI-2), timer (WI-1 c1), ownership provider (`WI-1 c2`), bảng admission tool (WI-6), setHeader/setFooter no-op (WI-13 PR1), shim 4833 dòng (WI-10 bước 6).