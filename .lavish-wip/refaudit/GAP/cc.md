# cc — omp THIEU 39 · CO MOT PHAN 53 · DA CO 19 · tong 111

## Thieu han (39)

- **cc.1** Compile-time feature gating with real dead-code elimination
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: HAT NHANH rong nhung co mot hat giiong: packages/coding-agent/scripts/bundle-dist.ts:98-101 dung `Bun.build({ define: { "process.e

- **cc.2** Ports-and-adapters workflow engine with deterministic journal replay
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Tu dong nhat gan nhat la python/robomp, nhung KHONG phai engine: python/robomp/src/persona.py:72 `seed_phases()` doc phase tuong t

- **cc.4** Post-bundle source rewriting for runtime compatibility
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Duy nhat thao tac ghi ra sau bundle la `ensureShebang` (bundle-dist.ts:37-38) — prefix shebang, khong phai compat patch. Khong co 

- **cc.5** One directory per tool, uniform shape
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Doi chieu: cc.5 la 63 thu muc `tools/<ToolName>/` moi chua implementation + prompt.ts + validation module. omp dung quy uoc file p

- **cc.9** Declarative-only plugin model (no in-process code)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Day la phuong dien nguoc cua cc.9. cc.9 la "load-bearing decision": reject code in-process de khong bao gio RCE trong host. omp ch

- **cc.20** Four hook execution types, all out-of-process
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: cc.20 ba quyet dinh out-of-process cho ca 4 loai ("entirely mediated by subprocesses") — omp chon nguoc: hook la code chay trong d

- **cc.21** Hook conditional execution primitives
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: CHUOT HOC cc.21 — "matcher dung lai permission-rule syntax de tranh spawn hook cho lenh khong khop" — la thu dung nhat de lay vi n

- **cc.23** apt-style dependency semantics (presence guarantee, not module graph)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co manifest field, khong co closure DFS, khong co demote-on-load. Plugin khong the khai bao gi ve nhau.

- **cc.24** Cross-marketplace dependency quarantine (no transitive trust)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co khai bao dependency gi cho gi, nen cung khong co ranh gioi bao ve trust xuyen marketplace.

- **cc.25** Enterprise marketplace allowlist / blocklist enforced pre-download
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co kiem duyet nguon tai chon tai; moi nguon duoc clone truc tiep.

- **cc.27** Per-plugin enterprise kill switch
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Co toggle de bao tri, khong co co che thu hoi fleet-wide tu mot co.

- **cc.28** Delisting auto-uninstall
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Maintainer rut mot plugin khoi marketplace thi user cu no giu nguyen cai da tai.

- **cc.30** Container-friendly read-only seed layer
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Air-gapped container van phai clone lai tu network; PI_CONFIG_DIR doi toan bo config root chu khong tao layer read-only rieng.

- **cc.31** MCP Bundles (MCPB) as a second packaging format
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co format zip-bundle thu hai; chi co directory-plugin (pluginRoot + skills/commands/mcpServers/lspServers).

- **cc.32** Settings allowlist of exactly one key
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co allowlist literal nao gioi han plugin settings; blast radius cua config plugin khong bi bound boi mot dong trong loader.

- **cc.34** Discriminated error union over string matching
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co discriminated union; UI phai parse chuoi message, dung thu moi doi la vong lap.

- **cc.37** Marketplace trust surface is honest about its limits
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co banner canh bao gi khi cai plugin tu marketplace.

- **cc.38** Agent loop as a typed Terminal/Continue algebra
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Loop co typing o muc message (StopReason 5 bien) chu khong phai 10-variant Terminal + 7-variant Continue, va khong ghi lai 'vi sao

- **cc.41** Non-cache token formula for budget accounting
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Co du lieu `iterations` nhung dung sai muc dich: tinh tien, khong phi cong no-cache de decrement remaining qua bien gioi compactio

- **cc.44** API-round grouping as a provably safe split point
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co nhom theo API round; boundary chi theo role, dung y cc.44.

- **cc.57** Memory-release discipline in the hot loop
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có cả hai chiến lược: (a) shallow-copy strip payload nặng khỏi mảng gửi API, (b) phá chuỗi closure observability + dọn `perf

- **cc.63** Multi-backend teammate runtime
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥3 họ tên: backend/registry, tmux/iTerm/Pane/WindowsTerminal, teammate, permissionBridge/leaderPermission/permissionSync, s

- **cc.64** Scoped post-compaction cache cleanup
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 8 tên khác nhau trước khi kết luận `no`. Cơ chế scoped-reset mà cc.64 mô tả không tồn tại. Lưu ý hazard có thật (subagent c

- **cc.67** CLI acts as its own MCP server (`claude mcp serve`)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp là MCP client thuần, không có mode server. Đã thử 7 tên khác nhau (mcp serve, mcpServerMode, asMcpServer, exposeMcpServer, mcp

- **cc.68** InProcessTransport: zero-spawn in-process MCP servers
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Có một transportPair() tương tự trong test ACP (packages/utils/test/acp.test.ts:13-20 dùng TransformStream), nhưng đó là test help

- **cc.69** Three built-in MCP servers (computer-use / claude-for-chrome / VSCode SDK)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Capability (browser/GUI control) thì omp có — computer tool (packages/coding-agent/src/tools/computer.ts + tools/computer/{worker,

- **cc.70** Channels: inbound MCP (server pushes into conversation + remote permission approval)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ hai cơ chế gần đó nhưng qua protocol khác: (1) IRC bus nội bộ agent-to-agent — packages/coding-agent/src/irc/bus.ts:1-11; (

- **cc.76** Fail-open MITM upstream proxy for containers
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là năng lực Anthropic-container-specific (đọc /run/ccr/session_token, prctl, relay WebSocket). Không phải thứ omp cần. infra/b

- **cc.80** Build-time feature-flag DCE that also gates command registration
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Điểm tốt của omp: vì command list tĩnh, ai grep cũng thấy đủ 50 command — tránh đúng cái trap CC tự ghi ra ("makes the command sur

- **cc.81** Notification queue with priority, invalidation, folding, timeout
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: notifyQueue, NotificationCenter, useNotifications. Có 2 mảnh ghép rời: fold (chỉ trong TtsrNotificationComponent.add

- **cc.85** Virtualized transcript with sticky prompt header and unseen-messages pill
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên khác (VirtualList, virtual-list, jumpToBottom/unseen/belowFold). omp giải quyết bài toán scale transcript theo hướng 

- **cc.93** Fullscreen/alternate-screen as an opt-in marker file requiring a shell-profile restart
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Alternate buffer CÓ (vào khi mở fullscreen overlay, có track altScreenActive + re-push kitty flags) nhưng KHÔNG có phần capability

- **cc.96** Reserved-shortcut protection with explicit user-facing errors
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có reservedShortcuts.ts, không có validate.ts, không có KeybindingWarnings.tsx. Có detect trùng key nhưng không ai tiêu thụ 

- **cc.102** Shadowed-rule detection that reports unreachable allow rules with an actionable fix
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có shadowedRuleDetection.ts, không detectUnreachableRules, không isSharedSettingSource(). Cũng không có lớp managed/policy đ

- **cc.103** SSRF guard implemented as a DNS lookup hook, not a pre-flight check
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: proxy.ts:23-57 phân loại 127/8, 0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, ::, fe80::/10, fc00::/7, metadata.google.intern

- **cc.105** Single-invalidation settings cache (session + per-source + per-path)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp dùng mô hình khác: settings giữ nguyên trong field sống (#global/#project/#configOverlay/#overrides tại settings.ts:547-563) v

- **cc.107** File-descriptor secret ingress with a locked-down disk fallback
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp lấy secret qua biến môi trường (packages/ai/src/registry/hooks/env.ts), store SQLite 0600, và file token broker 0600. Không có

- **cc.108** Per-sink analytics killswitch that fails open by design
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp chỉ có OpenTelemetry một sink, tắt bằng cách host không truyền config (tắt ở tầng compile/host), không có killswitch runtime t

- **cc.110** Sandbox config adapter that converts permission rules into OS-level restrictions
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có convertToSandboxRuntimeConfig, không dịch WebFetch `domain:` / Edit / Read rule sang allow/deny path, không tự-bảo-vệ khô

## Co mot phan (53)

- **cc.3** One entrypoint, two runtimes, two shebang launchers :: CO: mot source entrypoint duy nhat bundle mot lan + launcher shebang 2 dong. THIEU: runtime thu hai. cc.3 noi `dist/cli-bun.js` VA `dist/cli-node.js`; omp chi co mot. Ngoai ra bundle-dist.ts:31-35 con

- **cc.7** Doc site and spec-driven feature folders :: CO: gia tri cua "design rationale lam artifact ben vung" — 134 file markdown, ton tai cung cap agent doc (`packages/coding-agent/src/discovery/agents-md.ts`, `claude-md.ts`). THIEU: (a) khong co Mintl

- **cc.8** Repo carries its own agent instructions and a design/brand brief :: cc.8 mo ta bo HAI file (AGENTS.md + CLAUDE.md) cong mot brief thiet ke. omp chi co MOT file (AGENTS.md). Chua co gi tuong duong cua `.impeccable.md` (users / brand personality / anti-references). Ghi 

- **cc.10** Fixed capability table (11 slots, no more) :: Dieu cc.10 bao ve — "mot spread expression, them 1 slot phai sua schema" — omp van co mot interface dong nhat vua. Nhung cc.10 cam ket "chi 11 slot DATA, khong co UI/keybinding/provider/auth/permissio

- **cc.11** Convention directories + manifest supplement (additive, never replacing) :: Diem dang chu y nhat cua cc.11 ("manifest chi ADD, khong bao gio THAY the convention dir") — omp vi pham o commands (includeFallback: false) ma dung o skills. `includeFallback` la co the tat, khong ph

- **cc.12** Flat namespacing of every contributed component :: CO MOT PHAN: chi MCP server duoc namespace `plugin:server`. THIEU: command / skill / agent / output-style deu KHONG namespace — va day la quyet dinh co chu dich (ly do ky thuat ve `skill://` URL parsi

- **cc.13** Typed userConfig with a typed secret channel :: Phan co: typed schema + mask trong UI (dat, thong tin user nhin thay). Phan thieu trong y cua cc.13: (1) khong co bien substitution nen `sensitive` chi la co mat hinh UI, gia tri van nằm plaintext tre

- **cc.14** Secrets never reach the model context :: omp co MOT co che khac — the he thong obfuscation toan cuc hon (bat ca regex credential lap vao noi dung session, khong chi config value cua plugin), nhung (1) no khong gan voi plugin, (2) no mac dinh

- **cc.17** Explicit 3-layer state model (intent / materialization / active) :: Phan co: ba khoang luu tru (settings / dia + registry / registry in-memory) va co fan provider priority de resolve. Phan thieu dung nhu cc.17 noi: khong co ham diff bao cao "settings noi X, dia dang Y

- **cc.18** Refresh = clear caches + re-read disk + swap immutable state :: Insight goc cua cc.18 ("voi mo hinh khai bao, reload thu gon thanh invalidate + doc lai — khong con gi de viet them") omp nhan dung o cap do implementation: no KHONG co per-plugin lifecycle nao de tea

- **cc.19** Precedence chain with an explicit managed-settings override :: CHUOI co, TANG ADMIN khong co. cc.19 la "copy the precedence, va copy thoi thuc surface 'ban copy bi bo qua va ly do la gi' thay vi bo qua im lang" — omp lam het phan sau: provider bi disable im lang 

- **cc.22** Channels: plugin-provided inbound message push :: Van de cua cc.22 ("mo rong mot notification channel server->client co san thay vi invent protocol moi") omp da lam dung ve mat ky thuat — co san fan-out notification + co san `pi.sendMessage` de injec

- **cc.26** Marketplace impersonation + homograph defense :: Het mot nua: chan homograph non-ASCII co hieu luc nhung bang luat dang chu khong phai mot defensive homograph check co chu dich; danh sach ten chinh thuc + rang buoc nguon chinh thuc thi hoan toan kho

- **cc.29** Marketplace abstraction: 8 source kinds, one interface :: Co abstraction nhieu source kind va xu ly git URL that, nhung con 3/8 marketplace kind + 1/6 plugin kind chua co va npm chua chayy.

- **cc.33** Lenient-at-the-edge, strict-in-the-middle validation :: Co 'mot entry hong thi bo qua, khong lam sap doiem ca marketplace' (dat bang chinh xac), nhung khong co 'ty trong config ma hieu la loi tac gia thi fail' -- nested object duoc bo qua im lang.

- **cc.35** Non-inplace updates (disk-only, restart to apply) :: Co 'disk-only, khong hot-swap' + co 3 che do, nhung thieu chi tiet quan trong nhat cua cc.35 la buffer de khong mat thong bao khi update hoan thanh truoc REPL.

- **cc.36** Skill-directory-as-command-directory :: Hai loai bi surface rieng, khong dung mot khai bao de mang ca prompt mot lan va skill nhieu buoc.

- **cc.39** Per-iteration context-shrink pipeline with token-delta threading :: omp CO pipeline thu tu + so token freed tung pass, nhung CHU DONG KHONG thread delta vao nguong quyet dinh -- dung nguoc voi fix trung tam cua cc.39. Day la 'co phan' chu phai 'co': p hai doc lap bi q

- **cc.40** Token accounting anchored on last API usage + rough estimate for the tail :: Co 'usage chinh xac + uoc luong' nhung uoc luong cham toan bo lich su bang tokenizer that (dat hon), va buoc di nguoc qua cac split cung message.id khong ton tai vi khong co split.

- **cc.42** Compaction ladder with model-aware buffer and a failure circuit breaker :: Ca hai nua deu co o dang tuong duong chuc nang (buffer ti le voi window + cam vong lap compaction), nhung khong co model-aware reserve va khong phai dem loi lien tiep.

- **cc.43** Tool-pair invariant repair at every history cut :: Hop dong duoc giu (cat bao gio khong sinh history khong cap toi), nhung bang co che XOA thay vi sua, va khong co buoc walk-back tai cut.

- **cc.45** Compaction-of-the-compactor: head-truncating PTL retry loop :: CÓ: vòng retry khi chính lệnh tổng hợp tràn context — compactor tự thu nhỏ input rồi thử lại thay vì bỏ cuộc (đúng solve). KHÁC cơ chế: omp HALVE-AND-REPLAN (chia lại cùng message thành nhiều window +

- **cc.46** Concurrency-partitioned tool dispatch with deferred context modifiers :: CÓ: phân loại an toàn chạy song song theo tool + fallback thận trọng khi predicate throw + lịch barrier tách batch. KHÁC: omp dùng mô hình shared/exclusive với barrier xen kẽ, KHÔNG phải partition "re

- **cc.47** Tools execute while the model is still streaming :: CÓ: tool thực sự chạy trong lúc model còn đang stream. KHÁC căn bản: omp là framework speculative OPT-IN — chỉ `read` (assess/execute/commit/discard với snapshot-hash validation) và `eval` (stream.ope

- **cc.49** Two-tier max-output-token recovery :: CÓ: tier 2 của cc.49 — bounded 3 lần inject "resume" rồi release lỗi (đúng `MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3`). THIẾU: tier 1 `max_output_tokens_escalate` — nâng cap im lặng, retry không tiêm mess

- **cc.52** Subagent with fork-context, prompt-cache-stable tool inheritance, and transcript routing :: CÓ: spawn subagent với bộ tham số rõ ràng, kế thừa tool set của parent, transcript riêng (`<artifactsDir>/<id>.jsonl`, executor.ts:3498). THIẾU phần lõi của cc.52: KHÔNG forkContextMessages — hội thoạ

- **cc.53** Per-agent-type context slimming :: CÓ: giới hạn tool theo loại agent (agent.tools → read-only agent không thể có write tool; restrictToolNames cắt cả extension tool), và phân loại isReadOnlyAgent. THIẾU: cơ chế bỏ CONTEXT theo loại age

- **cc.54** Token budget continuation with diminishing-returns detection :: CÓ: theo dõi token budget, continuation prompt, một steer khi chạm ngưỡng, và pattern trần bounded. THIẾU: soft threshold của cc.54 (dưới 90% → nudge tiếp tục với %+số token) — omp cắt CỨNG ở 100% (đú

- **cc.55** Prompt-cache break detection with per-tool schema hashing :: CÓ: hash per-tool schema (đúng phần hashing của cc.55) + phát hiện miss lúc chạy. THIẾU: phần attribution — không có `perToolHashes` map để suy ra TÊN tool đã đổi khi danh sách tool không đổi, không c

- **cc.59** Server-side context editing strategies :: CÓ: context_management với clear_thinking + compact_20260112 (trigger input_tokens) + on-demand compaction summarize + beta header. THIẾU: chiến lược `clear_tool_uses_20250919` hoàn toàn (không có cle

- **cc.60** Per-category context attribution :: CÓ: attribution theo category + category dự trữ + `/context` render. THIẾU 3 category so với cc.60 (CLAUDE.md/memory tách riêng — omp gộp vào systemContext; MCP tool definitions tách riêng — gộp vào s

- **cc.61** Narrow dependency injection for the loop :: CÓ DI: loop nhận toàn bộ I/O seam qua một object config, chữ ký được định kiểu nên đổi chữ ký là lỗi compile tại call site — cùng ý cc.61. KHÁC đáng kể: phạm vi RỘNG (~50 dep) chứ không hẹp (4 dep như

- **cc.62** Tool interface as a behavioural contract, not a schema :: CÓ: loop branch trên field do tool cung cấp, không phải switch theo tên tool — đúng solve. THIẾU so với `CoreTool` của cc.62: isReadOnly, isDestructive, isOpenWorld, isSearchOrReadCommand, maxResultSi

- **cc.66** MCP client: 8 transports across 7 config scopes :: CÓ: abstraction client chung + nguồn config phong phú hơn 7 scope của cc + union trạng thái. THIẾU 5/8 transport (sse-ide, ws-ide, ws, sdk, claudeai-proxy — không có WebSocket nào), và state `needs-au

- **cc.73** Tool search: defer tool schemas out of the prompt :: omp giải quyết cùng mục tiêu (giữ schema khỏi prompt) bằng cơ chế khác: mount tool thành virtual device URL điều khiển qua read/write, thay vì một tool tìm kiếm theo keyword. Điểm khác biệt quan trọng

- **cc.77** Vendored Chinese reverse-engineering doc site :: THIẾU: không phải site (không Mintlify/docs.json, không .mdx, không tabulate built-in server + feature flag), và toàn bộ là tiếng Anh chứ không phải tiếng Trung. CÓ: hệ thống docs .md với cross-link c

- **cc.78** Seven-stage TUI render pipeline with hard split from input pipeline :: omp dùng mô hình KHÁC và mạnh hơn ở một chỗ: thay vì giữ transcript trong cell buffer + repaint diff, nó ĐẨY finalized rows vào native terminal scrollback qua HistoryBatch có monotonic-id + acknowledg

- **cc.79** Keybindings as declarative data table with contexts, not handler conditionals :: Đây là partial thật, không phải has: bảng khai báo + user merge + display-lookup đều có (giải quyết đúng failure mode CC nêu — keymap drift giữa help/tips/settings), nhưng thiếu hẳn trục context và ch

- **cc.84** Modal-relative chrome: overlays paint over transcript, not fixed layer :: omp có cơ chế overlay thật + alternate-screen cho fullscreen, nhưng thiếu toàn bộ phần thiết kế của CC: modal bottom-anchored với peek để giữ mạch hội thoại, và context để suppress chrome lồng nhau.

- **cc.88** Two-axis mode system: permission modes (shift+tab) plus named personas :: Đây là partial theo nghĩa: TRIỂN KHAI có (hai trục độc lập, đúng insight của CC — 'be terse' không ngầm 'skip permissions'), nhưng cơ chế tương tác thiếu — không có shift+tab cycling, không có mode in

- **cc.90** Multi-step wizard framework with pluggable step components and its own navigation footer :: CÓ: WizardStep là component trình bày tái sử dụng cho input/choice/confirm/async step + footer slot; SetupWizardComponent sở hữu scene index + footer. THIẾU: không có wizard *runtime/provider* dùng ch

- **cc.91** Multi-emulator desktop notifications as a first-class hook :: CÓ ĐỦ phần transport đa-emulator: OSC9/OSC99/BEL + D-Bus notify-send→gdbus fallback, gate PI_NO_DESKTOP_NOTIFY=1, tắt được qua settings (cfgErrorNotify / cfgCompletionNotify, nhóm settings "Notificati

- **cc.94** Slash command as a uniform type with lazy loading, hidden flag, availability gate, and aliases :: CÓ: uniform type, aliases, lazy `load: () => import()`, nguồn lệnh đa dạng (builtin/skill/extension/custom/mcp_prompt/file), prompt-command qua `{prompt: string}`. THIẾU: không có cờ `isHidden` trên C

- **cc.95** Customizable statusline driven by user-supplied commands :: CÓ: statusline rất giàu, preset + custom chọn segment trái/phải, cùng dữ liệu sống (cost, token, context %, model, mode, path, session, git, pr, collab, vim). THIẾU phần cốt lõi: segment chỉ được vẽ t

- **cc.97** Platform- and terminal-capability-aware default bindings :: CÓ: nhánh platform (win32 alt+v vs darwin super+v), dual-binding cho terminal cũ/mới, fallback bị gỡ khi user chiếm key. THIẾU: capability detection (VT mode, kitty protocol) chỉ phục vụ render/image/

- **cc.98** Self-hosted remote control as a first-class feature :: CÓ: /collab host phiên + collab-web React client + relay content-blind + key trong URL fragment (WebCrypto AES-GCM), và quản lý SSH host. THIẾU: không có lệnh server tự-host được ship như sản phẩm (lo

- **cc.99** Escaped-paren permission rule parser with legacy tool-name aliasing :: CÓ NỬA aliasing: bảng legacy tool-name giữ rule allow/deny/prompt cũ còn chạy sau khi đổi tên. THIẾU NỬA parser: không hề có cú pháp `Tool(...)` nên không có findFirstUnescapedChar/findLastUnescapedCh

- **cc.100** Three-way shell rule matcher (exact / legacy prefix / wildcard) with escape-safe wildcard compilation :: CÓ: khớp wildcard neo toàn chuỗi, khớp theo từng segment của lệnh ghép (tokenizeShellSegments), và bất đối xứng allow vs deny/prompt đúng tinh thần cc. THIẾU: chỉ một loại `*`, không có union exact/pr

- **cc.101** Bypass-immune safety checks layered above hook and bypass-mode decisions :: CÓ: blocklist lệnh nguy hiểm (rm -rf /, fork bomb, curl|sh, nc -e, kill -9 1…) được áp trước khi rơi về mode, nên yolo không bỏ qua; user policy allow/deny/prompt được áp ở mọi mode. THIẾU: không có b

- **cc.104** Six-layer settings cascade with a four-tier first-source-wins enterprise policy branch :: CÓ: cascade nhiều lớp + chuỗi overlay cha (parent revision) + chu trình đọc/validate layer project trước khi thay (reader không thấy cấu hình nửa vời). THIẾU: 4 lớp + parent chain chứ không phải 6; KH

- **cc.106** Daemon supervisor with crash-rate parking and permanent/transient exit-code contract :: CÓ: supervisor thật với backoff luỹ thừa + chính sách always/on-failure + đếm consecutiveFailures + state file. THIẾU: KHÔNG có crash-rate parking — không có MAX_RAPID_FAILURES, daemon lỗi lặp sẽ rest

- **cc.109** Error taxonomy with errno/axios classifiers and a short stack for model-facing errors :: CÓ: taxonomy typed đầy đủ + provider HTTP classifier + errno helper isEnoent dùng thay cho cast thô + chặn body lỗi Anthropic 64 KiB. THIẾU: không có shortErrorStack(e, maxFrames=5) cắt stack cho tool

- **cc.111** Hook config resolved across all editable settings sources with an explicit priority table :: omp CÓ phần "provenance + priority + hiển thị nguồn" nhưng ở tầng capability-provider, KHÁC kiến trúc cc: (1) KHÔ có mô hình `hooks` key trong file settings — hook là module .ts/.js trong thư mục `hoo

