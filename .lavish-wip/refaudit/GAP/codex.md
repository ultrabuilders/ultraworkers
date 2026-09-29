# codex — omp THIEU 33 · CO MOT PHAN 85 · DA CO 23 · tong 141

## Thieu han (33)

- **codex.3** Split execution plane (exec-server as a separate process)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có exec plane riêng. omp CÓ các daemon process khác (lsp/mux/daemon.ts, predict/daemon.ts, blob-broker/server.ts, computer w

- **codex.8** Snapshot testing as the terminal-UI regression contract
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có cơ chế golden-file nào. packages/tui/test/ có ~150 test file assert output render inline (bash-render.test.ts, autocomple

- **codex.9** First-class skill retrieval (8-strategy selector)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có retrieval layer cho skills. Không có BM25, character n-gram, LRU, reciprocal-rank fusion, không có multi-strategy selecto

- **codex.21** Hook trust by content hash with a 4-state machine
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có gì. Đặc biệt KHÔNG có trạng thái `Modified` (đã duyệt rồi bị sửa) — đây là phần codex đánh giá là đáng nhất. Nearest anal

- **codex.22** Managed-hooks-only mode
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có tầng admin/enterprise. omp có provider enable/disable nhưng đó là setting của chính user và nằm ở chiều ngược lại (user b

- **codex.26** Plugin commands are MIGRATED TO SKILLS, not registered as commands
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co buoc migrate command -> skill, khong co `source-command-<slug>`, khong co bo loc placeholder $ARGUMENTS/$1/!`/@mention, k

- **codex.27** Backend share model: principals x roles x discoverability
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co `PluginShareTarget{principal_type,principal_id,role}`, khong co `reader|editor|owner`, khong co `LISTED|UNLISTED|PRIVATE`

- **codex.30** Mention-gated plugin prompt injection
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co co che mention-gating cho PLUGIN. OMP nap plugin eager; cac diem kiem soat token (rulebook vs always-apply, `disableModel

- **codex.31** Plugin capability summary - the actual model-facing surface
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co struct {config_name,display_name,plugin_namespace,description,has_skills,mcp_server_names,app_connector_ids}. `InstalledP

- **codex.35** Curated marketplace namespacing with target-marketplace eligibility
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co 5 ten reserved, khong co `TargetCuratedMarketplace`, khong co `plugin_is_eligible_for_target_marketplace`, khong co `Plug

- **codex.57** Library-level ban on stdout/stderr
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có lint nào cấm console trong thư viện, và quy ước cũng không được giữ: 44 file trong packages/*/src vẫn dùng console.*. AGE

- **codex.61** BM25 deferred tool discovery (tool_search)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: BM25 tool discovery đã bị GỠ CỐ Ý, không có bản thay thế: settings.ts:2973-2987 xoá tools.discoveryMode / tools.essentialOverride 

- **codex.65** Provider policy reduced to one wire format
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp đi ngược lại thiết kế này: chủ động hỗ trợ NHIỀU wire API (Anthropic Messages, OpenAI Completions, OpenAI Responses, OpenAI Co

- **codex.71** Layered sandbox backends behind one policy transform
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có sandbox nào. Đã thử 6 tên khác nhau (sandbox, seatbelt, landlock, bwrap, sandbox-exec, jail/seccomp) và 0 kết quả thậ

- **codex.77** execve interception + out-of-sandbox escalation voi real FD handoff
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có cơ chế này. Đã tìm bằng 6 tên: execve, SCM_RIGHTS, dup2, fd_handoff, file_descriptor, unix socket — toàn bộ 16 hit đề

- **codex.80** Chan "always allow" tren shell interpreter
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có khái niệm này ở bất kỳ tên nào. Và vì cả codex.79 cũng chỉ là cache in-memory (không append prefix rule bền vững) nên

- **codex.82** Post-quantum Noise channel cho remote exec relay
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có Noise channel, không có hybrid-IK X25519+ML-KEM-768, không có registry xác nhận client key, không có exec-server crat

- **codex.83** Secret store: age-encrypted file + passphrase trong OS keyring
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có OS keyring, KHÔNG age-encrypted store, KHÔNG wipe key memory. Có 2 thứ KHÁC: (1) packages/coding-agent/src/secrets/* 

- **codex.86** Pre-main process hardening
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG harden tiến trình trước main. Không PR_SET_DUMPABLE=0, không PT_DENY_ATTACH, không RLIMIT_CORE=0, không xoá LD_*/DYLD_* 

- **codex.87** Protected workspace metadata
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG bảo vệ metadata workspace. Agent có thể tự do ghi .git/hooks/pre-commit, .git/config, hoặc file config của chính omp tro

- **codex.88** Sandbox violation classification + audit
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là trường hợp thú vị: file-write-fallback.ts ĐÃ có phần errno-classification mà codex.88 cần (EPERM/EACCES/EROFS + xử lý ENOEN

- **codex.89** Guardian: LLM reviewer + host constraint enforcement
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ advisor (packages/coding-agent/src/advisor/, 13 file) là LLM reviewer thật, nhưng nó thụ động: `advise-tool.ts` phát note `

- **codex.94** Feature flag có stage vắng lại
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có `config/registry.ts` (~36 KB) đăng ký setting có type/default/ui-metadata, và `features.unexpectedStopDetection` là một set

- **codex.101** Kiểm thử bằng golden file Buffer kèm style từng ô
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: .snap, toMatchSnapshot, toMatchInlineSnapshot — rỗng cả 3. omp có hàng trăm test render TUI nhưng theo mẫu `toContai

- **codex.103** Trình remap phím tắt ngay trong TUI
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên: keymap, remap, rebind, capture-view. omp remap chỉ qua file cấu hình: `KeybindingsManager.create()` nạp `agentDir/ke

- **codex.113** Trình cải hoa/blossom chạy ngay trong terminal
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Gần nhất là packages/tui/src/overlays/codex-reset-fireworks.ts (FRAME_INTERVAL_MS=85, 34 frame) — nhưng đó là overlay ăn mừng khi 

- **codex.114** Terminal pet (8 sprite) phản hồi trạng thái task
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ hạ tầng ảnh terminal (packages/tui/src/kitty-graphics.ts, terminal-capabilities.ts ImageProtocol) và có avatar commit trong

- **codex.118** Chế độ inline (giữ scrollback) chọn được qua /tui cho lần chạy sau
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có khái niệm "chọn chế độ hiển thị cho lần chạy sau" — không có cờ tương đương --no-alt-screen, không có hộp thoại xác n

- **codex.123** Chống trùng phiên: thẻ "đang mở ở app khác"
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có nhắc khái niệm "single-writer lock" (packages/coding-agent/src/session/session-manager.ts:3533, packages/coding-agent/src/c

- **codex.128** Nối thẳng từ "agent xong" tới "code chạy được"
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Hai nơi dùng git apply đều là workflow nội bộ, không phải lệnh gắn với diff cuối của phiên: packages/coding-agent/src/cli/git-tui/

- **codex.130** Sinh TypeScript bindings và JSON Schema từ app-server protocol
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ tầng protocol (`packages/wire/src/index.ts` — collab wire types có version handshake ở :385; `packages/coding-agent/src/mod

- **codex.132** Cú phích biệt danh /gooooal chạy /goal
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có hạ tầng alias đúng kiểu registry (và autocomplete.ts:391-407 chấm điểm alias khi lọc), nhưng không có cơ chế matching NGOÀI

- **codex.134** Chế độ raw scrollback để copy thuận tiện
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có bất kỳ cơ chế nào tắt khung cảnh hoá tạm thời để terminal selection hoạt động. Alt+R bị chiếm bởi app.retry. Đây là kết q

## Co mot phan (85)

- **codex.1** Shared base-crate discipline (protocol as the one true vocabulary) :: CÓ: một leaf package giữ domain type dùng chung, và nó là package có nhiều dependent nhất. THIẾU: nửa `#[non_exhaustive]` — gần như không có trong crates/. Đây là chính sách mở rộng an toàn cho enum; 

- **codex.2** Capability-based extension API (contributors + capabilities, not a god-object) :: CÓ đầy đủ cơ chế: provider khai báo capability id + priority thay vì sở hữu file; extension khai báo event seam qua ExtensionAPI.on(). THIẾU: (1) không có họ `ext/` crate riêng — 84 thư mục tính năng 

- **codex.4** One agent, many frontends via a JSON-RPC app-server + multi-transport :: CÓ: tách agent khỏi UI thật sự — 7+ frontend (TUI, print, --mode rpc, --mode acp, TS SDK, Python SDK, web collab), không frontend nào link core. THIẾU: không có MỘT app-server protocol crate phục vụ t

- **codex.5** Bindings generated from the Rust schema, in two languages :: CÓ: SDK TypeScript + SDK Python cùng tồn tại và được dùng thật (robomp dùng omp-rpc làm client). THIẾU: KHÔNG có codegen — cả hai binding đều viết tay, không có schema/typescript/ hay schema/json/ ngu

- **codex.6** Versioned SQLite state split across four databases :: CÓ: nhiều DB SQLite thật, tách theo miền, có index thật (idx_history_created_at, idx_session_recaps_session, FTS trên history). THIẾU: KHÔNG có file migration .sql đánh số; versioning là hằng SCHEMA_V

- **codex.7** Append-only JSONL rollout with a reverse scanner and writer lock :: CÓ: JSONL append-only, cross-process writer lock thật (mạnh hơn codex ở chỗ có 3 backend OS), gzip cold archive. THIẾU: reverse/tail scanner (đọc tiến + cap byte → resume không O(tail)); bất biến 'app

- **codex.11** Three-platform OS-level sandboxing with split filesystem policies :: KHÔNG có OS-level syscall sandbox (Seatbelt/bwrap/Landlock/restricted-token) ở bất kỳ đâu trong agent — bash tool chạy với đầy quyền user. Có một lớp cô lập khác: robomp dùng container + per-slot file

- **codex.14** npm distribution of a native binary with correct signal/exit-code forwarding :: CÓ: phân phối native binary nhiều nền tảng (release pipeline + curl installer + npm publish workspace). THIẾU: đúng cơ chế codex mô tả — không có `bin/omp.js` Node shim, không có async spawn giữ signa

- **codex.15** Context-fragment contract (bounded, append-only, cache-stable) :: CÓ MỘT NỬA rất mạnh: append-only + cache-stable (StablePrefix snapshot, fingerprint fast path, invalidate()). THIẾU NỬA 'bounded': không có ContextualUserFragment trait, không có hard cap per-fragment

- **codex.17** Declarative plugin manifest with a 5-field capability set :: CÓ ý tưởng cốt lõi: manifest chỉ là dữ liệu, không có entrypoint để chạy code trong process; và có capability registry buộc plugin khai báo loại artifact. THIẾU shape cụ thể: không có `paths { skills,

- **codex.19** Cross-tool manifest path compatibility :: CÓ cơ chế: danh sách const thứ tự cố định, thử lần lượt. THIẾU: chỉ 2 trong 3 (hoặc 4) đường dẫn — không đọc `.codex-plugin/` hay `.cursor-plugin/`, nên chưa đạt 'một plugin tree, ba host đọc'. THIẾU 

- **codex.20** Hook system: 12 events, 4 handler kinds, matcher groups :: CÓ: hệ hook thật, event nhiều hơn codex, có thể chặn (tool_call) và sửa (tool_result, context), có UI bridge, có 12 ví dụ. THIẾU 4 thứ cụ thể: file khai báo `hooks.json` dạng {Event:[{matcher,hooks:[.

- **codex.23** Extension API: 14 typed contributor slots (INTERNAL ONLY) :: CO: typed event/slot API co - va nhieu hon (37 event so voi 14 slot). THIEU: kieu internal static registry (Vec<Arc<dyn Trait>> theo slot, builder -> build() -> freeze) dung de tach 12 subsystem khoi 

- **codex.24** Plugin identity <name>@<marketplace> with asymmetric segment validation :: CO: dinh dang `<name>@<marketplace>` + validate ca 2 ve truoc khi dung lam cache path (luan do an toan giong codex). THIEU: quy tac BAT DOI - codex cho phep `.` trong plugin name nhung CAM trong marke

- **codex.25** Versioned content-addressed plugin cache with atomic activate + rollback :: CO: cache co version, staging + atomic rename, backup-then-rollback co error ten backup con sot. THIEU: (a) content-addressing - layout la name+version, khong co digest; (b) kiem tra manifest BYTES kh

- **codex.28** Host-owned MCP policy overlay (plugin owns transport, host owns policy) :: CO: manifest plugin/Agent Plugins that co tai thong (mcp.json closed document o plugin root), va host co the tat bat server bang ten qua disabledServers/enabledServers + ToolApproval chung. THIEU: ove

- **codex.32** Authority-bound resource locator (environment-owned filesystems) :: CO: containment check chung cho moi resource cua plugin (Agent Plugins §4.1), resolve realpath truoc khi doc. THIEU TOAN BO PHAN "authority": khong co `Environment{environment_id,path}`, khong co exec

- **codex.33** Config-driven enable toggles with last-write-wins merge :: CO: toggle `enabled` co that, ton tai qua upgrade, va co shadowing rule project/user. THIEU: co che 3 hinh dang dotted config edit path (`plugins.<id>.enabled` / `plugins.<id>` / ca bang `plugins`) go

- **codex.34** Per-plugin-MCP data roots, format-dependent :: CO: co data root rieng cho moi plugin instance, va digest 16 hex cua `instanceKey` (da bao gom marketplace/scope/local-dir) tranh alias. THIEU: khong co hai FORMAT cung ton tai tren mot data root - kh

- **codex.36** Two-queue actor core (Submission Queue / Event Queue) :: CO: co EventMsg phia (AgentEvent union + chuoi handle->dispatch->process) va co HAI queue tin nhan (steering/followUp) - trung ten "two-queue". THIEU: khong co `Op` enum tong hop moi host->agent lenh,

- **codex.37** Three-level state split: Session / SessionState / StepContext :: CO mot phan: moi vong lap lai deu dựng lai provider-bound context truoc khi mo turn. THIEU: khong co `SessionState` sau mutex tach bien doi, khong co `StepContext` bat bien chup MOT LAN moi request ro

- **codex.40** WorldState: per-section diff rendering to keep context stable :: CO: giai quyet DUNG MUC TICH (giu prompt cache) bang co che khac - freeze prefix + append-only log + `invalidate()` tu explicit (VD sau MCP reconnect). THIEU: khong co trait `render_diff(previous) -> 

- **codex.41** MailboxDeliveryPhase: hold subagent mail until the turn stops emitting visible text :: CO: co enum 4 gia tri va `aside` THAT SU non-interrupting (giai van de: mail den giua cau tra loi da hien thi khong lam cau tra loi viet lai). THIEU: phase do CALLER chon, khong co may trang thai tu d

- **codex.42** Per-turn ModelClientSession with WebSocket + sticky-routing reuse across retries :: CO: WebSocket session cache + prewarm + sticky `x-codex-turn-state` per-turn (comment :551 "mirroring codex-rs's per-turn OnceLock") + `response.steer` + compaction reset giu connection. THIEU: scope 

- **codex.43** Three-way compaction strategy behind one dispatcher :: CO: MOT dispatcher chon theo thu tu, 5 chieu hon 3, cung mot `CompactionEntry` lifecycle; phase la tham so explicit tren Codex nhanh. THIEU: nhanh thu BA cua codex - `Feature::TokenBudget` bo qua summ

- **codex.44** Two-scope auto-compact accounting with a server-observed prefill baseline :: CO: co mot quy tac hai NGUON - max(token provider bao, uoc luong local cua stored conversation) de khong bi on-wire compression lam dau sai, va co compactionEpoch chan anchor cu truoc cut. THIEU: khon

- **codex.46** Cross-agent-tree weighted token budget (RolloutBudget) :: CÓ: trần token theo turn (đã cộng output của eval subagent qua #turnEvalOutput) và Goal Mode tokenBudget có cơ chế budget-limited + steer. THIẾU: không có weight vector (output_token_weight / prefill_

- **codex.47** Subagents as full sessions with a spawn registry and hard caps :: CÓ: subagent là AgentSession đầy đủ (agentKind "sub", history/compaction/tool-set riêng); cap concurrency theo session (mặc định 32) + cap depth + spawn allowlist; semaphore acquire trước khi execute 

- **codex.48** Tool registry / router split with deferred disclosure (BM25 tool_search) :: CÓ: registry Map + loadMode 'discoverable' gỡ schema khỏi request, kênh khám phá là `xd://` (read xd:// liệt kê, read xd://<tool> lấy docs+schema, write xd://<tool> thực thi). THIẾU: KHÔNG có tool_sea

- **codex.49** Approval cache keyed by canonicalized action, enabling escalation-without-re-prompt :: CÓ: cache quyết định allow_always/reject_always theo session (ACP) + session grant cho cfg://. THIẾU: key là TÊN TOOL ('bash', 'edit:delete'), không phải hành động đã canonicalize — không có canonical

- **codex.51** Guardian: an isolated synchronous reviewer sub-session for approvals :: Advisor là reviewer thụ động theo turn, KHÔNG tham gia quyết định approval (0 hit trên toàn bộ đường approval). Không có ExhaustedReviewBudget/retire-on-exhaust (chỉ có status quota_exhausted tự retry

- **codex.53** Append-only JSONL rollout with compression, reverse scan, and SQLite side-index :: THIẾU: không có reverse JSONL scanner. session-loader.ts:89-164 đọc TUẦN TỰ bằng Bun.JSONL.parseChunk với giới hạn số record (:28), không có đường tail-only cho resume. Nén có nhưng khác: gc-cli.ts gz

- **codex.55** Streaming protocol contract: started/completed item pairs with server-assigned or client-assigned IDs :: THIẾU: không có assign_missing_streamed_response_item_id; không có reserve display-order lúc Added; không có cap analytics id; không có quy tắc "hoãn emit token-count khi turn đang chờ người". Định da

- **codex.56** Sandbox-denial escalation without re-approval :: CÓ control flow denial→retry, nhưng chỉ cho ghi/xoá file và KHÔNG đi qua approval: handler fallback do extension đăng ký, tool call gốc chưa từng bị gate. Vì vậy "without re-approval" là rỗng chứ khôn

- **codex.58** MCP client over stdio + streamable HTTP with dual protocol generations :: THIẾU: không có hai thế hệ protocol được ghim và chọn theo transport. Chỉ một MCP_PROTOCOL_VERSION = "2025-11-25"; bản server trả về được lưu qua setProtocolVersion nhưng CHỈ transport HTTP implement 

- **codex.59** Full MCP OAuth stack (RFC 9728 + 7591) plus Enterprise Managed Auth :: CÓ đủ RFC 9728 (protected-resource-metadata) + RFC 7591 (dynamic client registration) + challenge parsing + profile-scoped credential store. THIẾU toàn bộ nhánh Enterprise Managed Auth: không có ema_c

- **codex.62** MCP server registry with source attribution and credential isolation :: CÓ: gộp nhiều nguồn (claude.json, codex config.toml, opencode, plugin-bundled mcpServers) kèm SourceMeta từng server, và có hai chính sách chống credential bleed (env literal không expand/không chạy !

- **codex.64** Hardened stdio launcher with process-group containment :: CÓ containment POSIX: Linux/other POSIX detach qua setsid, giết theo process-group (process.kill(-pid, signal)) có fallback về child trực tiếp, và luôn escalate SIGTERM→SIGKILL cho leader đã detach. T

- **codex.67** MITM-intercepting network proxy with credential broker :: omp CHỈ có lớp proxy phía CLIENT (436 dòng, wrap fetch qua HTTP proxy env + bypass danh sách host nội bộ/metadata: 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fe80::/10, fc00::/7). Đây là SSR

- **codex.68** Six independent SQLite databases with per-DB migrations :: omp có NHIỀU DB hơn codex (agent.db, models.db, history.db, stats.db, skill-descriptions.db, mnemopi.db, cost_log.db, triples.db, autoqa.db, github-cache.db, commit-inference.db, judgment-cache.db) nh

- **codex.69** Git via hybrid gix plus hardened subprocess :: Đúng phần cốt lõi: hybrid gix (0.85, default-features=false) + subprocess git trong cùng crate pi-vcs (11.996 dòng, 17 file so với 17 file của codex). apply_env() unset 10 biến GIT_* (GIT_DIR, GIT_COM

- **codex.70** Persistent shell session (exec_command + write_stdin) rather than one-shot exec :: omp CÓ persistent shell thật: bash-executor.ts giữ map shellSessions theo sessionKey (shell+prefix+snapshotPath+env+minimizer) để cd/pwd/env persist qua các lần gọi tool, có quarantine khi session hỏn

- **codex.72** App-server JSON-RPC surface (263 methods) as the embedding contract :: omp CÓ JSON-RPC server 2 chiều thật qua ACP (Agent Client Protocol) stdio, và CÓ server-initiated approval — session/request_permission trong dispatchClient, cộng elicitation/create. Đây là đúng ý tưở

- **codex.73** Extension contributor system as the plugin SDK :: omp CÓ extension SDK thật và khá rộng: tool, hook, custom command, skill, slash-command, plugin marketplace, overlay/UI widget, keybinding, model query, terminal handler, write/delete fallback handler

- **codex.74** Code Mode: tools callable from inside a V8 sandbox over gRPC :: omp ĐÃ IMPLEMENT chính ý tưởng codex.74 (OMP gọi nó "Codex Code Mode" và tham chiếu tới codex-rs): thu hẹp direct tool surface cho model tool_mode=code_mode_only, phần còn lại gọi qua eval bridge bằng

- **codex.75** Unified SDK layer over SSE, Responses WebSocket, and Realtime WebSocket :: omp có cả ba loại transport nhưng rải rác, KHÔNG có codex-api SDK layer thống nhất: SSE nằm rải trong từng provider (anthropic.ts, openai-responses.ts), WebSocket chỉ có cho openai-codex với preferWeb

- **codex.76** JSONL rollouts with reverse scanning and compression :: omp CÓ phần lõi: session lưu JSONL append-only (session-storage.ts, artifact dir = tên file bỏ .jsonl), có index tách riêng (SessionStorageBackend.loadIndex trả path/size/mtime/title), và có đọc hai đ

- **codex.78** Execpolicy DSL: policy-as-code cho quyet dinh exec :: omp CÓ lớp quyết định exec có cấu trúc nhưng KHÔNG phải DSL: rule là JSON array trong config YAML (bash.patterns), mỗi rule {match, approval: allow|deny|prompt}, wildcard chỉ '*', không có prefix_rule

- **codex.79** Persistent "always allow" voi advisory file lock + idempotent append :: omp CÓ khái niệm "always allow" nhưng chỉ ở tầng ACP client-bridge: lựa chọn allow_always được cache in-memory theo cacheKey (toolName hoặc edit:delete/edit:move) và áp lại trong phiên — mất khi resta

- **codex.81** Managed network proxy: MITM + CA + SOCKS5 + SSRF guard + credential broker :: CHỈ CÓ 1 trong 5 thành phần: SSRF/metadata guard (isLocalOrMetadataHost) — và nó bảo vệ chính request của agent chứ không canh child process. THIẾU: MITM, CA sinh tay, SOCKS5, credential broker (env c

- **codex.84** 9 lop config voi precedence so, va requirements.toml khong user override duoc :: omp CÓ precedence + per-key origin (xem codex.85) với 6 layer: runtime override → config overlay → project → global → overlay parent → schema default, cộng assertKnownSettingPaths chặn typo path. NHƯN

- **codex.85** Per-key config origin + disabled-layer diagnostics :: omp trả lời đúng câu hỏi "setting này đến từ đâu" nhưng chỉ ở dạng MỘT enum string cho setting đang hỏi, không phải map key→metadata cho toàn bộ effective config. THIẾU: (a) origins() trả về metadata 

- **codex.90** Granular approval policy (5 cờ độc lập) :: CÓ: (a) `tools.approvalMode` enum 3 giá trị toàn cục; (b) `tools.approval.<tên-tool>` record allow|deny|prompt, `deny` = auto-REJECT (approval.ts:349-351 throw denyError) — tương đương `false = auto-R

- **codex.91** SQLite state: 6 DB tách, WAL, migration checksum + cross-version tolerate :: CÓ: WAL bật ở nhiều store; nhiều DB tách theo domain (nhiều hơn 6); bảng version + logic chịu version mới hơn (chỉ warn, không từ chối mở) — đúng tinh thần `ignore_missing`. THIẾU: KHÔNG có migration 

- **codex.92** Durable user-input queue theo thread (SQLite, revision) :: CÓ: hàng đợi input người dùng khi agent đang chạy, với 3 chế độ steer/followUp/aside, và cả kênh live-steering (provider OpenAI Responses `response.steer` nhận input giữa lượt stream). THIẾU: bộ đệm c

- **codex.93** Hook lifecycle 12 điểm + managed-hooks-only :: CÓ: hệ hook giàu hơn codex — 27 biến thể event (Session 13 + Context + BeforeAgentStart + Agent/Turn start-end + AutoCompaction + AutoRetry + TtsrTriggered + TodoReminder + ToolCall/Result), có matche

- **codex.95** Session approval cache nhiều key :: CÓ (chỉ đường ACP): `#acpPermissionDecisions` cache quyết định `allow_always` / `reject_always` cho cả phiên. THIẾU đúng ý nghĩa codex: cache KHÔNG multi-key. Vì `cacheKey` là tên tool, approve 1 lần 

- **codex.96** Slash command registry với ưu tiên trình bày do thứ tự enum :: CÓ: một registry phẳng 42 lệnh dùng chung cho TUI dispatcher, ACP dispatcher, help và autocomplete (BUILTIN_SLASH_COMMAND_DEFS là nguồn duy nhất) — đúng phần "1 danh sách cho cả 2 nơi". Thứ tự khai bá

- **codex.97** Keymap context-scoped + validator xung đột chéo context :: CÓ: action ID có namespace kiểu `tui.editor.cursorUp` / `app.interrupt` / `app.agents.hub` — tương đương `KeymapActionId::config_path()`; có phát hiện xung đột (2 action cùng key) trong `KeybindingsMa

- **codex.98** Ưu tiên key mặc định nhường bước cho binding tuỳ biến :: CÓ ĐÚNG CƠ CHẾ codex mô tả: nếu user đã chiếm key fallback của action khác, key mặc định bị GỠ khỏi danh sách thay vì ghi đè. THIẾU: chỉ áp dụng cho 2 binding (`app.message.followUp` với WINDOWS_FOLLO

- **codex.100** Trait Renderable với cursor + scroll offset + style :: CÓ: `Insets` tương đương (`LayoutInsets` + `layoutInsets()` geometry.ts:9,131) và cơ chế trao quyền con trỏ cho component (`setUseTerminalCursor`, tui.ts:959). THIẾU 4 hàm cốt lõi: `desired_height(wid

- **codex.104** Statusline và terminal title cấu hình được theo danh sách mục :: CÓ (statusline): đúng mô hình "tick mục + preset + ẩn khi thiếu dữ liệu" — 26 mục, left/right segments, segmentOptions theo họ (model/path/git/time), sửa qua /settings (statusLine.leftSegments dòng 27

- **codex.105** Theme `.tmTheme` bundle tìm thêm từ thư mục themes :: CÓ: kho theme lớn hơn codex (90 vs 6), quét thêm thư mục theme tuỳ biến, dò light/dark qua `detectColorMode` + terminal capability probe, picker CÓ live preview (`onPreview` qua `onSelectionChange`). 

- **codex.106** Agent command center — bảng điều khiển nhiều task :: CÓ: bảng điều khiển roster sống với trạng thái vòng đời, unread count, gom nhóm cây theo project, tìm kiếm, hành động revive/abort — đáp ứng "quản lý nhiều agent song song". Ngoài ra còn có `agents-hu

- **codex.107** Phân lớp overlay: BottomPaneView stack + pager overlay :: CÓ: stack overlay có thật, có alt-screen fullscreen overlay, có `OverlayFocusOwner.ownsOverlayFocusTarget` để overlay cha giao focus xuống con, và có `preFocus` để khôi phục focus nền. THIẾU: không có

- **codex.108** Một picker chung phục vụ nhiều call site :: CÓ: một `SelectList` dùng 52 chỗ, lo phần trình bày/cuộn/cắt chữ/chiều cao/wrap mô tả; và action là closure (`onSelect`) chứ không phải biến thể enum trung tâm — nên menu MỚI không cần sửa enum, đúng 

- **codex.109** Bảng hướng dẫn phím tắt tự co cột (3→2→1) :: CÓ phần đáng giữ: hint động lấy từ keymap đã resolve, nên binding đã remap / bị disable hiện đúng (có cả chuỗi "Disabled" khi action không gắn key, hotkeys-markdown.ts:44-46). THIẾU: không có bảng 3→2

- **codex.110** Chống giật khi gõ nhanh (paste-burst) + bracketed paste :: CÓ: bracketed paste chuẩn hoá về 1 sự kiện (kèm cap 64 MiB chống mất end-marker, và decode lại byte Ctrl bị tmux re-encode); fast path cho run ký tự thường gọi thẳng `#insertCharacter` bỏ qua dãy disp

- **codex.112** Bật/tắt animation 6 effect, tự dò screen reader 1 lần :: CÓ: công tắc bật/tắt/đổi kiểu cho ~6 hiệu ứng, nhưng rải rác ở các nhóm khác nhau, không có khoá tổng `[tui] animations` làm công tắc mẹ. THIẾU: hoàn toàn không có screen-reader probe (OnceLock/Motion

- **codex.115** Bốn renderer giàu nội dung bật/tắt độc lập :: CÓ ĐỦ cả 4 renderer. THIẾU 3/4 công tắc: không có toggle cho math, tables, lists (tắt là giữ nguyên nguồn). Cũng không có nhóm `[tui.rendering]` tách biệt khỏi animations như codex cố ý làm.

- **codex.116** Dashboard phân tích tài khoản ngay trong TUI :: CÓ một overlay phân tích toàn màn hình trong TUI, nhưng nội dung là quota/rate-limit theo tài khoản + heatmap hoạt động, KHÔNG phải báo cáo token/chi phí. THIẾU: tab báo cáo, biểu đồ (chỉ có thanh quo

- **codex.117** Thông báo desktop qua OSC 9 / BEL với điều kiện focus :: CÓ phần backend, thậm chí mạnh hơn codex: OSC 9/OSC 99 + BEL, bọc DCS passthrough cho tmux, thêm BEL cho Zellij, và fallback sang D-Bus libnotify khi terminal VTE không hiểu OSC (desktop-notify.ts:1-2

- **codex.120** Chế độ Vim đầy đủ: 4 context, 69 action :: CÓ: 3 mode (insert/normal/visual/visual-line) + operator d/y/c + motion cơ bản (h j k l 0 w b e G W B p g i a I A o O), state machine thuần tuý có thể unit-test không cần terminal. THIẾU: 4 KeymapCont

- **codex.122** Hook vòng đời hiển thị ngay trên UI :: CÓ: engine hook vòng đời đầy đủ (SessionEvent, TurnStart/End, BeforeAgentStart, ToolCall/Result, AutoCompaction…) và một kênh status-line. THIẾU: `/hooks` browser xem cấu hình hook, trạng thái hook ch

- **codex.124** Bảng quyền tác động tới việc gõ tiếp theo :: CÓ: chính sách allow/deny/prompt theo từng tool qua `tools.approval.<tool>`, 3 approval mode, prompt hiện tên tool + Reason + chi tiết lệnh. THIẾU phần quan trọng nhất của codex: chỉ có 2 lựa chọn App

- **codex.125** Sandbox / approval chọn ngay từ dòng lệnh :: CÓ: chọn approval mode ngay từ CLI. THIẾU: không có --sandbox, không có --ask-for-approval, không có cờ nguy hiểm --dangerously-bypass-approvals-and-sandbox. Quan trọng hơn: args.ts là parser tự viết 

- **codex.127** Trình chẩn đoán `codex doctor` 150 KB :: CÓ mẫu "doctor" với cấu trúc kết quả có severity, nhưng CHỈ áp cho images/blob-broker. THIẾU: một `omp doctor` tổng thể kiểm tra install + config + auth + runtime như codex; thay vào đó người dùng phả

- **codex.129** Quản lý session từ CLI không cần vào TUI :: CÓ: resume/fork/continue từ CLI và /resume /fork /delete /export /queue trong TUI. THIẾU: subcommand `omp session` chuyên dụng, các verb archive/unarchive, và cờ giải quyết mục tiêu `--last` / `--all`

- **codex.133** Sao chép có cấu trúc: cell, dòng, cây, cả cây :: CÓ: picker /copy toàn màn hình điều hướng 2 cấp (turn → block), copy theo cấu trúc chứ không theo màu; copy nhanh theo loại (code/cmd/link); /dump xuất markdown cả cuộc hội thoại kèm prelude cấu hình;

- **codex.135** Trợ giá kiểm tra cấu hình từ trong TUI :: CÓ: `/debug` là menu chẩn đoán trong TUI rất đầy đủ (system info, terminal state, log gần đây, memory, profile CPU, protocol probe, raw SSE, JS remote debugger, report bundle, export transcript). CÓ `

- **codex.136** Kiểm tra chéo cấu hình bằng chính bộ chẩn đoán :: CÓ: cơ chế `onUndeclaredKey("reject")` tồn tại ngay trong omptype (tương đương `deny_unknown_fields`) — chỉ là chưa dùng cho config. CÓ: validation theo từng setting trên đường ghi (throw Unknown sett

- **codex.138** Thư mục tự hướng dẫn trong chính mã nguồn :: CÓ một nửa: doc đầu module được viết rất tốt và giải thích đúng thứ tự quyết định (ví dụ copy-selector.ts mô tả rõ luồng Enter copy / Right đi sâu / Left-Esc quay lại và vì sao overlay fullscreen nên 

- **codex.139** Chính sách "cho phép trong lúc task chạy" :: CÓ phần KẾT QUẢ: lệnh thuần trình bày (/model, /skills, /context, /usage, /tools, /settings, /copy, /debug, /share…) chạy được giữa lúc task đang chạy; lệnh biến đổi trạng thái bị chặn KÈM thông báo c

- **codex.140** Sidebar "hội thoại phụ" (/side, /btw) :: CÓ: hội thoại phụ đúng nghĩa — hỏi câu phụ không làm nhiễu luồng chính, có streaming panel, copy (`c`), follow-up nối tiếp (`f`), và `b` để NÂNG câu trả lời vào hội thoại chính (branch, theo `leafId` 

- **codex.141** Bảng thống kê chi phí theo luồng (credits · ~$1.82) :: CÓ nền tảng dữ liệu: cost đầy đủ (input/output/cacheRead/cacheWrite), phân rã theo model, context window + phần trăm + phần tiết kiệm từ system prompt/tool result, dashboard `/usage` với lưới subscrip

