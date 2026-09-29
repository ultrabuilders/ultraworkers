# TỔNG HỢP — omp đã phân rã được chỗ nào, còn khoảng trống ở đâu

## 1. Câu trả lời một dòng

Trên ~40 bề mặt người dùng chạm tới mà 9 đợt quét soi tới, **13 bề mặt đã có seam thật** (không chỉ có `register*` trên type mà còn có consumer thật gọi tới), và **27 chỗ còn lại hoặc không có đường, hoặc có seam rỗng** — trong đó **6 chỗ chặn trực tiếp luận điểm "mọi thứ là plugin"** (bảng verb CLI, registry theme, handle app-shell, từ vựng session event, định dạng đầu ra, bảng status-line segment), và **trong 6 chỗ đó chỉ 2 đã có work item** (WI-7 status-line segment, WI-13 header/footer — cả hai đều chưa có code).

Đo bằng lệnh thật, không suy đoán:

| Phép đo | Lệnh | Kết quả |
|---|---|---|
| Số hàm `register*` trên `ExtensionAPI` | `grep -cE "^\s*register[A-Z]…" types.ts` | **11** — không cái nào chạm theme / verb / segment / output-format / exporter |
| `registerTheme` / `registerSubcommand` / `registerOutputFormat` | `git grep -w` trên `packages/*/src` | **0 hit cả ba** |
| Số lần các tên đó xuất hiện trong toàn bộ kế hoạch | `git grep -how "registerTheme" 'MILESTONE_*.md' COMPREHENSIVE_PLAN…` | **0 / 0 / 0** (kèm `registerMode` = 74, `registerSetting` = có) |

---

## 2. Bảng xếp hạng gap — xếp theo mức chặn luận điểm, không theo cỡ

### Nhóm A — chặn trực tiếp

| Bề mặt | Cỡ | Chặn luận điểm | Seam cần là gì |
|---|---|---|---|
| **Bảng verb CLI top-level** | M | **Có** | `registerSubcommand(entry)` + sửa index dựng 1 lần + load extension **trước** routing + xoá `RESERVED_TOP_LEVEL_WORDS` |
| **Registry theme** (custom bị bỏ qua + 4 nơi stub + shim drop) | S | **Có** | `registerTheme(name, json)` + chính sách shadow + provenance để gỡ khi uninstall |
| **Handle `TUI` sống tra cho plugin** | M | **Có** | Interface 6–8 member thay cho class thật; tách `stop` / `setFrameProvider` / `resetDisplay` / `terminal` / `children` ra khỏi tầm với |
| **Từ vựng session event** | M | **Có** | Một bảng tên event duy nhất + `ExtensionContext.subscribe()` + đưa `onSession` ra khỏi TUI |
| **Định dạng đầu ra `/export`, `security://`** | M | **Có** | `registerOutputFormat(name, renderer)`; `/export --format` đọc registry |
| **Bảng status-line segment** (27 id) | M | **Có** | `registerStatusSegment(id, render)` theo đúng khuôn `registerComposerShape` |
| **Smithery registry nằm trong core** | M | **Có** | MCP registry provider thay vì 3 module + 3 subcommand hardcode |
| **Image generation backend** | M | **Có** | Provider registration cho image (`registerProvider` có sẵn cho text, hụt cho image) |
| **Bảng admission tool** (25 nhánh `name ===` + 14 `requestedTools.push`) | M | **Có (một nửa)** | Cho extension đóng góp predicate + quy tắc ghép cặp; hiện bảng là `switch` đóng theo tên |
| **Tab/group của settings panel** | M | **Có** | Mở `SettingTab` / `SETTING_TABS` / `TAB_METADATA` / `TAB_GROUPS` thành registry |
| **Telemetry exporter** (`signalEnabled` chỉ nhận `otlp`/`none`) | L | **Có** | `registerTelemetryExporter`; 2800 dòng, 0 seam |
| **Header / footer** | S | **Có (seam rỗng)** | Nối thật vào `FooterComponent`, **hoặc** gỡ khỏi interface |
| **Control Center — danh mục 9 loại capability** | S | Một nửa | Vòng lặp động trên tập `kind` |
| **MCP filter theo tên provider** (`EXA_*`, `BROWSER_MCP_*`) | S | Một nửa | Bảng policy lấy từ registry thay vì literal trong TS |
| **Image budget theo provider** (9 provider, mặc định 5) | S | Không | Cho extension khai budget |

### Nhóm B — seam có một chiều

| Bề mặt | Cỡ | Chặn | Seam cần là gì |
|---|---|---|---|
| **Compaction `protectedTools`** (`pruning.ts:57`, đúng 2 phần tử) | M | Một nửa | Chiều "giữ" — extension tool trả payload không tái dựng được cần opt-out khỏi elide |
| **Toolset theo mode** (`VIBE_TOOL_NAMES` 5 tên) | S | Một nửa | Extension đóng góp toolset của mode, có event `mode_change` |
| **Env → settings** | M | Một nửa | `Setting.env` có sẵn (67 binding) nhưng `registerSetting` chưa tồn tại |
| **`omp stats` panel / route** | S | Không | Có sẵn tiền lệ `setStatsJudgeProvider` — chỉ thiếu `registerStatsRoute` |

### Nhóm C — lỗ hổng hẹp, không chặn

| Bề mặt | Cỡ | Chặn | Vị trí |
|---|---|---|---|
| Advisor `KNOWN_TOOL_NAMES` (30 tên, đóng) | S | Không | `advisor/config.ts:139`, gate tại `:153` |
| Memory ingestion gate (4 tên) | S | Không | `memories/index.ts:726` |
| Migration retire key (49 `delete raw[...]`) | S | Không | `config/settings.ts`, một hàm 900 dòng |
| Completion `--tools` (30 tên đóng băng) | XS | Không | `cli/completion-gen.ts:80` |
| MCP transport (3 nhánh) | L | Không | `mcp/client.ts:73-85` |
| LSP action list | S | Không | có `action: "request"` nhưng không phải registration seam |

### Vì sao nhóm A xếp trên, bằng chứng

**Verb CLI** — bằng chứng mạnh nhất chống lại "thêm hàm là xong":

- `packages/utils/src/cli.ts:434-437` viết thẳng *"No filesystem scanning, no plugin system, no package.json reading."* Ràng chặn đã có sẵn dưới dạng văn bản, không phải sơ suất.
- `cli-commands.ts:314-335` core hardcode **9 tên verb của plugin** trong `RESERVED_TOP_LEVEL_WORDS` để tự vá #2935/#4845. Core phải liệt kê từ ngữ plugin ⇒ core không thể là plugin.
- `cli-commands.ts:289-295` dựng `SUBCOMMAND_NAMES` **một lần lúc module load**. Mảng `commands` export không `readonly`, nên ai cũng tưởng push vào là xong — nhưng `isSubcommand` đọc Set đã đóng, `resolveCliArgv` vẫn forward thành prompt. Đây là bẫy cho người implement: fix tối thiểu sinh ra một seam **trông như có nhưng không chạy**.
- Vòng đời: `cli.ts:607` dispatch → `launch.ts` dynamic import → `main.ts` gọi `loadExtensions`. Extension factory chạy **sau** khi argv đã định tuyến xong, nên ngay cả khi có `registerVerb` nó cũng không kịp.
- Chi phí M, không phải S: phải nối vào **3 consumer độc lập** (`cli.ts:607`, `profile-bootstrap.ts:36` qua `isSubcommand`, `completions.ts:12` qua `commands`) cộng nhánh phụ dựng help config ở `utils/src/cli.ts:449-453`, và đổi `RunOptions` ở tầng utils.

**Đã có tiền lệ cùng codebase đã giải đúng bài toán tương tự** — `cli/extension-flags.ts:27-29` viết nguyên văn: *"let a registered flag shadow a same-named built-in … No built-in name list to maintain."* Cơ chế cho phép shadow đã có; bảng verb chưa từng được áp.

**Theme** — 4 chỗ, cùng một luật "built-in thắng": `loader.ts:111` (`loadThemeJson`), `:127` (`loadThemeJsonSync`), `:64` (dedupe vứt mất `path` của file custom), `:29`+`:35` (`Set.add` no-op khi trùng). Không có ngoại lệ, không cảnh báo. Bằng chứng từ chính source: `legacy-pi-coding-agent-shim.ts:918` tự viết *"themes are silently dropped (OMP has no session-level themes surface)"*, hiện thực hoá ở `:892` và `:1150`.

**Handle TUI** — `ui.custom()` khai factory nhận `tui: TUI` (`types.ts:284-292`), truyền thẳng 3 chỗ: `extension-ui-controller.ts:1166` và `:378`, `interactive-mode.ts:6293`. `TUI` là class thật `extends Container` (`tui.ts:709` / `:441`); đếm được **33 method riêng + 8 method kế thừa**. Trong đó có `setFrameProvider` (`:949`, comment gọi là *"product-owned bounded frame provider"*), `resetDisplay` (`:2069`, doc nói *"never from ordinary rendering"*), `injectDebugInput` (`:1086`). Không `ReadonlyTUI`/`TuiFacade`/proxy nào tồn tại.

Phép đo phụ trợ đáng nói: test controller dựng fake `ui` chỉ **5 member** rồi ép kiểu `as unknown as` — controller thật cần 5, contract khai 41. Thu hẹp kiểu là thay đổi thuần kiểu.

**Session event** — `onSession` của tool chỉ có **một** call site (`extension-ui-controller.ts:567`), caller duy nhất là interactive mode. Ở `print` / `rpc` / `json`, nhánh shutdown không bao giờ chạy ⇒ rò resource. Đây là **lỗi thật**, không phải thiếu tính năng.

**Định dạng đầu ra** — `agent-session.ts:11931` `exportToHtml(outputPath?, useUserThemes = false)`, cả hai call site (`command-controller.ts:171`, `:296`) đều hardcode HTML. Không tham số format, không registry.

---

## 3. Cái ĐÃ phân rã rồi — đừng đề xuất lại

Đây là tiêu chuẩn tôi dùng để loại: **có `register*` VÀ có consumer thật gọi tới**.

| Bề mặt | Bằng chứng consumer thật |
|---|---|
| **Tool registration + rendering** (bề mặt mẫu) | `loader.ts:216` → `types.ts` khai `renderCall`/`renderResult` → `wrapper.ts:84/:92` → `hasBuiltInTool` trả false khi bị che tên (`session-tools.ts:645`) → `useBuiltInRenderer` (`event-controller.ts:1410`, `:1714`) → renderer của chính plugin |
| **Composer shape** (khuôn mẫu để copy) | `composer-shape-registry.ts:61` Map, `:64` install trả disposer, `:80-81` gộp built-in + extension. Đủ vòng đời register → render → selector → dispose |
| **Slash command** | `loader.ts:242` `extension.commands.set(name, …)` → registry slash |
| **CLI flag (phía parse)** | `runner.ts` `getFlags()` → `extension-flags.ts:36-44` `applyExtensionFlags` → `parseArgs` |
| **Overlay** | `types.ts:284-292` `ui.custom()` + `showOverlay`; không cần registry ở đây và điều đó **đúng** |
| **Widget / status text / title / autocomplete** | có key, có consumer |
| **Message + thinking renderer** | `types.ts:1475`, `:1478` |
| **File fallback (write + delete)** | `types.ts:1404`, `:1429` |
| **Provider registration** | `types.ts:1595` + `unregisterProvider` `:1603` |
| **`pi.events` EventBus** | `event-bus.ts` bus string mở, `emit` không kiểm tên, `on` trả disposer; `ExtensionAPI.events` (`types.ts:1606`); mọi extension trong một lần load dùng chung một bus. **Điểm yếu không phải thiếu năng lực mà là core không tiêu thụ** — 47 event có type không hề phản chiếu lên bus |
| **Teardown / dispose** | `emitSessionShutdownEvent` chạy ở mọi mode, `finally` luôn chạy dù handler ném; `ManagedTimers` nuốt throw + `unref` |
| **Nhận event (`pi.on`)** | kho `Map<string, HandlerFn[]>` mở, không allowlist, không validate tên |
| **MCP — khai báo server** | đi qua registry provider chuẩn + manifest field |
| **LSP — khai báo server** | manifest `lspServers` + `.lsp.json` từ plugin root (dạng khai báo, không phải lập trình) |
| **`omp stats` judge** | `frustration.ts:128 setStatsJudgeProvider()` — chứng minh chương trình biết làm seam cho loại này |
| **Settings — đường đọc** | extension đọc key tự do trong `config.yml` qua `getGlobalSettings()`/`getProjectSettings()`, key lạ không bị chặn ở đâu |
| **Settings — merge order** | 6 lớp chuẩn hoá, `getProvenance` báo lớp thắng. Core-owned và hoàn chỉnh |
| **File watcher** | extension nạp in-process bằng `await import()` ⇒ có `fs`/`fs.watch` sẵn |

Hai điểm cần nói thẳng vì ảnh hưởng cách diễn giải cả đợt quét:

1. **Extension không nằm trong sandbox.** Chúng chạy cùng tiến trình. Nên không finding nào ở đây là "plugin *kỹ thuật* không thể làm X" — tất cả đều là "plugin không có đường **có cấu trúc, được công bố, và xuất hiện trong UI/schema** để làm X". Nếu chương trình chấp nhận monkeypatch là đủ, phần lớn các finding sẽ tự biến mất — nhưng khi đó luận điểm "mọi thứ là plugin" cũng không còn gì để nói.
2. **Cùng codebase đã giải đúng một bài toán rồi bỏ qua ở chỗ khác.** Composer shape có registry động; status-line segment thì không. Pattern có sẵn, thiếu là áp dụng.

---

## 4. Đề xuất gom

### 4.1 Gom vào work item **đã có** (rẻ nhất — không cần milestone mới)

| Gap | Work item | Lý do hợp lệ |
|---|---|---|
| Status-line segment (27) | **M2 WI-7** (`registerMode` + status-line seam) | Đã lên kế hoạch đầy đủ, 74 hit `registerMode` trong plan. Cần mở rộng phạm vi: WI-7 cố ý thu hẹp union đóng, nên **không** phủ case "segment tùy ý không thuộc mode" |
| Tab/group settings panel | **M2-OQ4** | Đã đặt đúng câu hỏi "key extension render ở đâu", nhưng cả WI-8b lẫn OQ4 đều giả định key rơi vào một trong 10 tab có sẵn. Cần mở thêm `SettingTab`/`TAB_GROUPS` |
| Admission tool | **M2 WI-6** (`:3293`) | Đã sở hữu **hình dạng** bảng gate. Nhưng chính mục *"Người dùng thấy"* của nó viết *"Trực tiếp thì không"* — nó refactor, **không mở seam**. Cần một commit mở predicate cho extension, không chỉ đổi `if` thành `Map` |
| Header / footer | **M2 WI-13** | Đã sở hữu bề mặt nhưng với quyết định ngược hướng: ném lỗi thay vì dựng seam. Phần "dựng seam" thì chưa ai nhận |
| Telemetry exporter | **M1 W10** (adapter trung lập vendor) | Đã sở hữu nửa backend-contract. Nửa `pi.*` exposure + `signalEnabled()` thì chưa |
| Capability registry | **M2 WI-10** (doc) | Đã được giao viết dòng trạng thái *"CORE-ONLY / NOT EXTENSION-REACHABLE"* — tức **ghi nhận** seam đóng, không mở |

### 4.2 Cần work item mới — **đề xuất nhập vào M2**, không tạo milestone mới

Lý do: M2 đã tự đặt mục tiêu *"mọi thứ là plugin"*, đã có 21 work item, đã có cơ chế wave + open question. Tạo milestone mới tốn thêm một lớp quản trị cho những việc **cùng loại** với những gì M2 đang làm.

| Work item mới | Nội dung | Wave gợi ý |
|---|---|---|
| **WI-A — `registerSubcommand`** | Bống rào đã ghi ở §2. Bắt buộc gồm 3 việc: hàm đăng ký, **sửa cách dựng index** (`:289`), và **vòng load extension trước routing**. Xoá `RESERVED_TOP_LEVEL_WORDS` trong cùng commit để chứng minh giảm hardcode, không chỉ thêm code. Phải giữ nguyên contract: `cli-commands.ts` import được không side-effect + 50 entry vẫn lazy-load | sau WI-6 (dùng chung bảng quy tắc trùng tên) |
| **WI-B — `registerTheme` + shadow policy** | 3 phần: bucket provenance, chính sách shadow, cơ chế gỡ khi uninstall. Đồng thời nối 4 nơi stub `getAllThemes` về một nguồn và sửa `:892`/`:1150` trong shim | độc lập |
| **WI-C — thu hẹp handle TUI** | Tách **tiêu chuẩn thành 2 việc**: (1) định nghĩa interface 6–8 member, xoá `as unknown as` trong test — XS; (2) tách core-only khỏi tầm với — M. Làm (1) trước vì nó biến "cái gì là core-only" từ đọc 3600 dòng `tui.ts` thành đọc một file | sau WI-10 (viết bề mặt chuẩn) |
| **WI-D — registry định dạng đầu ra** | `/export --format`, `security://`, và provider telemetry/image-gen có thể gộp thành một hạng mục "integration surface registry" nếu owner muốn giảm số work item | độc lập |
| **WI-E — từ vựng event + đưa `onSession` ra khỏi TUI** | Bảng tên event duy nhất, `ExtensionContext.subscribe()`, và 3 nhánh đầu dây (bridge 9 nhánh còn thiếu, `onSession` 1 call site, forward `emit()` lên bus) | độc lập, nhưng phần *rò resource* nên lên trước phần registry |

**Cần milestone mới?** Không. Tất cả nằm trong khuôn "hardcode trong core chưa thành seam" — đúng trục M2. Chỉ khi WI-A tỏ ra phá vỡ cấu trúc vòng đời (extension phải load trước routing ⇒ `cli.ts` tách đôi) thì mới cân một milestone riêng; khi đó nó vẫn là **de-hardcode**, không phải chức năng mới.

---

## 5. Điều CHƯA biết

1. **Chưa quan sát hành vi runtime nào.** `bun test` không chạy (thiếu `pi_natives.win32-x64.node`); mọi phát biểu về hành vi ở trên là **suy từ mã tĩnh + call path đã đọc**. Ví dụ "B ghi đè A" với `setStatus` là hệ quả trực tiếp của `Map.set` cộng việc không có tiền tố, không phải từ một lần chạy.
2. **Vòng đời extension trước routing — chưa biết có khả thi không.** Nghi vấn thật: nếu `registerSubcommand` cần extension đã load, mà extension load cần session (`ExtensionContext` đầy đủ), thì có thể phải tách **hai giai đoạn load** (giai đoạn rẻ chỉ để đọc manifest top-level verb, giai đoạn đầy đủ sau routing). Chưa đo được chi phí thật; đây là ẩn số lớn nhất của WI-A.
3. **`setTheme(theme: Theme)` trả `"Direct theme object not supported"`** (`extension-ui-controller.ts:150-155`) trong khi type `:345` khai `string | Theme` — chưa kiểm tra xem đường `getTheme(name)` có bù lại không. Trông giống sót, nhưng chưa đủ bằng chứng để nâng thành finding.
4. **Số segment phân phối theo preset** — chưa biết `status` có mặt trong bao nhiêu preset, quyết định cái giá thực tế của việc chỉ có `setStatus(key, text)`.
5. **`TAB_GROUPS` vs nhóm dùng thật** — đợt trước báo 1:1 khớp, tôi chưa đếm lại độc lập. Nếu có nhóm không dùng thì phần "mở registry" rẻ hơn dự tính.
6. **Chưa biết milestone nào đang thực thi** — tôi chỉ đọc kế hoạch, không biết trạng thái thực tế của M2 wave nào. Trước khi giao WI-A/B/C cần xác nhận wave nào đang mở, vì WI-6 và WI-7 đều là tiền đề của chúng.
7. **Chưa kiểm `sandbox`** — nếu chương trình sẽ chọn sandbox extension sau này thì phần "thu hẹp handle" đổi từ *hợp đồng + kiểm toán* thành *rào chắn bảo mật*, và thứ tự ưu tiên giữa các gap sẽ phải tính lại.

---

**Ghi chú phương pháp**: READ-ONLY, không sửa file nào, không commit, không cài gì. Mọi con số trong bảng §2 tôi tự đếm lại bằng lệnh; hai chỗ khác với ghi chú đợt trước là `isToolAllowed` (**25** nhánh `name === "…"` trong khoảng `:730-805`, không phải 27) và registry settings (**518** lệnh `register({`, **487** `id: "`, **67** binding `env:`). Tránh `\b` trong `git grep` (trap Windows) và dùng pipeline `wc -l` có `awk` tổng cho line count.