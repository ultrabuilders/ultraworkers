# gajae — omp THIEU 44 · CO MOT PHAN 31 · DA CO 36 · tong 111

## Thieu han (44)

- **gajae.2** Managed task DAG with deterministic dependency-based readiness
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có task/parallel.ts + workpool.ts + provider-concurrency.ts (giới hạn số task chạy song song) nhưng KHÔNG có khái niệm DAG, pr

- **gajae.3** Capability-scoped opaque session attachments (SessionRouter)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có SDK (packages/coding-agent/src/sdk.ts, 225KB, createAgentSession) + RPC mode + ACP mode + collab host/guest, nhưng không có

- **gajae.4** Turn-scoped vs owned-scoped abort with bounded idempotency keys
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có phần 'no-op khi không có turn đang chạy' (acp-agent.ts:1078 `if (!promptTurn || promptTurn.settled) return`) và một cleanup

- **gajae.6** Profiling corpus with evidence-class gating
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ micro-benchmark: packages/coding-agent/bench/ (14 file .bench.ts) và packages/natives/bench/ (grep.ts, text.ts, workspace.t

- **gajae.9** Stream Deck hardware control surface for tmux/cmux sessions
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên khác (streamdeck, elgato, HID, hardware/USB). omp có tmux/cmux integration (modes/controllers/input-controller.ts, la

- **gajae.11** Coordinator MCP server as the multi-session control surface
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 5 tên (coordinator, mcp-serve, question-gate, reaper, orchestration) + kiểm tra cả python/robomp. omp có các bề mặt đa-sess

- **gajae.20** Capability-scoped function hooks with a host-owned ceiling
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 7 tên khác. omp có cơ chế GẦN NHẤT nhưng khác loại: docs/approval-mode.md (modes, user overrides, safety overrides, per-too

- **gajae.22** Plugin bundles — extend-only manifest with forbidden surfaces
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Ngược hẳn. omp có hệ plugin đầy đủ (marketplace manager/fetcher/registry, loader, manager 43KB, parser, types) nhưng manifest KHÔN

- **gajae.23** Two-tier hook trust — constrained API for third-party bundles
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Ngược hẳn: omp cấp API rộng cho hook, không có deny-list, không có post-hoc audit 'đúng event đã khai báo', không có quarantine su

- **gajae.25** Compile-validate-then-copy install with hash-drift quarantine
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Cài plugin của omp là `bun install` + ghi deps. Không có transaction, không có idempotency/no-op khi nội dung giống, không có --fo

- **gajae.26** Two-tier sub-skill advertisement (metadata vs full body)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có khái niệm sub-skill, không có parent binding, không có resolve activation từ `--arg`, không có cap 12 item / 200 ký t

- **gajae.30** Single-writer discipline enforced at the barrel
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Ngược cả quy ước: AGENTS.md của chính repo MANDATE star re-export ('In pure index.ts barrels, use star re-exports even for single-

- **gajae.31** Runtime finding accumulator — single publisher, generation-fenced consumers
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp gom lỗi load thành mảng string để hiển thị 1 lần lúc startup, không có mô hình generation-fenced merge nào.

- **gajae.34** Deliberate refusal to inherit MCP from other hosts
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là phát hiện đáng chú ý nhất của chunk: omp chọn phía KHÁC. Nó chủ động kế thừa MCP từ 5 host khác và coi đó là tính năng, khô

- **gajae.38** Host-capability-gated render strategy (viewport-repaint vs full-replay)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CÓ phân loại năng lực host rất tinh vi, nhưng KHÔNG dùng nó để chọn chiến lược render. Lựa chọn append/rebuild/preserve đến từ

- **gajae.42** Documented TUI design system with an explicit responsive contract
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Thiếu toàn bộ phần cốt lõi: frame anatomy (DynamicBorder → TabBar → Spacer → content), quy tắc hàng 2 cột của SettingsList (cap 30

- **gajae.44** Command palette with availability gating and a two-path fallback
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có palette gộp app actions + slash commands vào một danh sách xếp hạng. Cũng không có: re-dispatch `executeFresh` lúc nhấn đ

- **gajae.47** Multi-protocol sprite pet with a capability-gated selector
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co widget pixel-art bam day, khong co transport module rieng, khong co selector hien thi trang thai 'Saved, unavailable — re

- **gajae.51** Provisional provider-attempt transaction (discardable turn)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp khong co khai niem turn transaction: khong staging emission, khong discard() xoa turn khoi durable history, khong context wate

- **gajae.52** Six non-disableable emergency compaction floors
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co tang san nao do RSS, non-provider memory, kich thuoc JSONL tren dia, serialized context, inline image bytes hay so messag

- **gajae.53** Digest-verified two-phase tool-output pruning
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp co phan 'stale supersession' (readToolSupersedeKey + SUPERSEDED_NOTICE, pruning.ts:67/433) va cap tran bao ve, nhung thieu toa

- **gajae.54** Cache-economics gate on below-threshold pruning
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co predicate nao can doi giua tiet kiem pruning va chi phi reset cache epoch, va khong co maintenance-prune path nao bi chan

- **gajae.56** Deferred-escape transient steering instead of a tool error
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp khong co: detector \uXXXX trong tool args, khong co carve-out display-only, khong co SyntheticRecoveryKind, khong co synthetic

- **gajae.61** Attempt-scope lineage currentness authority
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp co dung van de ma capability nay giai quyet — moi noi tu phat minh staleness heuristic qua closure promptGeneration() — nhung 

- **gajae.62** Run resource ledger with settlement proofs and cancellation domains
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp khong co ledger per-run, khong co RunCancellationDomain (no dung AbortSignal.any truc tiep o agent-loop.ts:3079-3080), khong c

- **gajae.69** Subagent spawn gate (justification receipt above a hard threshold)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có cổng chặn fan-out. spawn-policy.ts tồn tại nhưng là allowlist tên agent (cho phép spawn agent nào), khác khái niệm "b

- **gajae.70** Fork-context budget ladder, re-clamped per child model
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có thang ngân sách 5 bậc (none/receipt/last-turn/bounded/full), KHÔNG có trimForkContextSeedForModel, KHÔNG có ForkContextAd

- **gajae.73** Cache-miss cost attribution with honesty levels
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có phân tầng 3 mức trung thực (actionable / diagnostic-only / provider-suspected), KHÔNG có missPremiumUsd, KHÔNG có CacheEc

- **gajae.77** Adaptive compaction threshold driven by fill × call rate
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có module adaptive, không có cửa sổ tumbling đếm call, không có trạng thái quay lại ngưỡng gốc sau compaction. omp chỉ có th

- **gajae.78** Dual-era MCP client (2026-07-28 "modern" + 2025-03-26 "legacy")
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp chỉ nói chuyện MỘT thế hệ MCP (SDK client tiêu chuẩn qua packages/coding-agent/src/mcp/client.ts + transports/). Không có `pro

- **gajae.79** MRTR input_required mid-tool elicitation with single verbatim retry
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có elicitation qua kênh ACP nhưng KHÔNG có kênh elicitation giữa tool của MCP. Cụ thể thiếu: MCP_RESULT_TYPE_INPUT_REQUIRED, r

- **gajae.80** Outward Coordinator MCP bridge (23 tools) over SDK sessions
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có MCP server đi ra để bên ngoài điều phối session. Các khả năng lân cận omp có (kênh IRC bridge, collab host, ACP) đều KHÔN

- **gajae.81** Deny-first plugin-bundle MCP security policy, enforced twice
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có chính sách mạng deny-first cho MCP server đi kèm plugin. packages/coding-agent/src/extensibility/plugins/marketplace/type

- **gajae.82** Codex handoff file protocol (cross-agent-session work transfer)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có vòng đời register→wake→ack trên đĩa cho bàn giao việc giữa hai agent CLI không chung transport. omp có packages/coding-ag

- **gajae.83** Canonical MCP connection-pool identity with generation-fenced leases
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có pool kết nối MCP dùng chung giữa các session, không có lease theo thế hệ, không có MCPPoolLeaseObsoleteError/MCPPoolLease

- **gajae.92** SDK broker over authenticated WebSocket with 19 typed operations
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Searched under 4 alternative framings (broker / daemon / session-authority / WebSocket-RPC). omp has no session-lifecycle authorit

- **gajae.96** Function-hook capability system với attenuation + grant hash + audit chain
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp has no runtime capability-grant system for hooks at all. Its `capability/` directory is a catalog of installable capability TY

- **gajae.99** Credential environment tách khỏi project `.env`
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là `no` mạnh nhất trong chunk: omp không chỉ thiếu `$credentialEnv`, nó CHỦ ĐỘNG làm ngược lại — merge `<cwd>/.env` vào `Bun.e

- **gajae.100** Telemetry allowlist + forbidden-key fail-closed + kill switch
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp's telemetry.ts là OpenTelemetry GenAI instrumentation LOCAL và opt-in (header:20-22 'Activation is opt-in … When unset, every 

- **gajae.101** Crash relay: hai tầng consent tách biệt, không có DSN literal trong binary
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có một crash-log PATH helper mà không ai dùng, và một postmortem signal/cleanup handler. Không có crash journal, không có cons

- **gajae.102** Lock file với host identity + stale verdict + manual cleanup command
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Quan trọng: đây không phải 'omp làm nửa'. gajae giải quyết stale-lock bằng owner token (host id + pid + process start time) + lsta

- **gajae.105** Redaction có budget thay vì redact vô hạn
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên khác (redactHookValue / bounded redact / structured sanitizer / maxDepth) trước khi kết luận `no`. omp KHÔNG có bất k

- **gajae.107** Daemon operator contract: exit code tách lỗi, và thừa nhận "unknown ≠ applied"
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên. Không có ownership-mismatch guard từ chối start khi daemon sống với token khác, và không có tri-state "unknown" khi 

- **gajae.109** Spawn gate: bắt buộc justification có cấu trúc khi fan-out lớn
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên (spawn-gate / SpawnPlanReceipt / justification+threshold). `grep -rn 'justification' packages/coding-agent/src/` chỉ 

## Co mot phan (31)

- **gajae.7** Compile entrypoint discipline with inline release-regression notes :: CÓ: kỷ luật compile + ghi chú lý do inline ngay tại chỗ + smoke probe trong CI. THIẾU: file compile-args.ts với danh sách releaseEntrypoints/devEntrypoints và các NOTE kiểu 'models.json must NOT be li

- **gajae.10** Generated, diff-checked SDK skills and dual-target plugin packaging :: CÓ (phần tiêu thụ đa hệ sinh thái): omp đọc được cả OMP-native lẫn Claude Code plugin format, và có provider agent-plugins (Agent Plugins standard) + codex + agents trong discovery. THIẾU (phần phát h

- **gajae.15** External-attachment policy expressed as a written surface table :: CÓ: mô tả bề mặt bằng văn bản, có phân biệt 'làm gì / không làm gì'. THIẾU: (1) một file tổng hợp duy nhất liệt kê TẤT CẢ bề mặt điều khiển ngoài + entrypoint + khi nào dùng; (2) danh sách 'đã gỡ, khô

- **gajae.16** Per-version CI task matrix with affected-task sharding :: CÓ: sharding + cổng fail-closed khi selector không chọn được gì (đúng bài học trọng tâm của reference). THIẾU: (1) chọn task theo DIFF (không có bộ chọn affected; sharding chia theo mode/bucket cố địn

- **gajae.21** Bounded redacting payload serializer for audit/observability :: CÓ: redaction bí mật rất mạnh (placeholder obfuscator 63KB với self-redaction, sort-by-length, round-trip qua placeholder). THIẾU: serializer có giới hạn cho payload điều khiển truy cập — không có giớ

- **gajae.24** Deny-first MCP network policy with rebinding defence :: CÓ: header precedence + origin-lock chặn redirect đổi origin. THIẾU: bảng deny loopback/private/link-local/multicast/unspecified + 169.254.169.254, xử lý IPv4-mapped/-compatible, zone-id, trailing-dot

- **gajae.27** Append-only prompt appendices as lower-authority injection :: CÓ: cơ chế append sau base prompt, có heading phân ranh giới. THIẾU: KHÔNG phải block per-plugin `<gjc-plugin-system-appendix>`/`<agent_appendix>` mà là MỘT append prompt của user; không cap 8 KiB/32 

- **gajae.29** Marketplace distribution via git clone with provenance re-verification :: CÓ: git-clone marketplace, temp-sibling + promote-sau-read đúng như gajae, escape check. THIẾU: `sourcePin()` phân loại immutable chỉ khi có SHA 40-hex, `assertPinnedSource()` từ chối restore khi khôn

- **gajae.33** Extensibility-surface doctor :: CÓ: hai lệnh doctor thật. THIẾU: phần cốt lõi của gajae là taxonomy phân loại 14 surface theo source class + remediation. Cái đó trong omp nằm ở chỗ khác: capability layer (`capability/index.ts` 19 KB

- **gajae.36** Two-tier remappable keybinding registry with platform-glyph rendering :: Khác bố cục: cả HAI registry nằm trong `packages/tui` (gajae tách tui/coding-agent). Thiếu 3 thứ then chốt của gajae: dispatch theo FocusDomain, phát hiện va chạm default key, và test chống doc drift.

- **gajae.43** Explicit chrome factory so every compact selector shares one frame :: CÓ các primitive dùng chung và đúng triết lý chống trôi chrome. THIẾU đúng cái gajae chỉ ra: một factory ~40 dòng trả về `Container[DynamicBorder, bold title, SelectList, DynamicBorder]` + map `select

- **gajae.45** Typed public command registry with flag validation, conflicts, and sectioned help :: CO: descriptor-driven flags/args tren moi Command subclass; args khai bao theo thu tu insertion = thu tu positional (cli.ts:255-272); validation doc tu descriptor (options enum, required, kind:integer

- **gajae.46** Terminal graphics capability probing with multiplexer distrust :: CO: classifyTerminalMultiplexer la nguon duy nhat cho cong render-path, nhan dien du tmux/screen/zellij (+herdr/cmux/wmux), va NO DA DUOC AP dung luan doan cua gajae cho cac capability ma id terminal 

- **gajae.48** Message queue pane with per-group reordering :: CO: tin nhan go khi dang chay bi queue (steering/follow-up/compaction queue — tham chi 3 nhom giao hang + 'aside'); selector QueueModeSelectorComponent chon all vs one-at-a-time (mac dinh 'recommended

- **gajae.49** Unicode-hardening applied to untrusted display text :: CO: sanitizeText (utils/src/sanitize-text.ts:23) dung text.toWellFormed() + strip C0/C1/DEL + ANSI truoc khi render; sanitizeDisplayText (:13) cong replaceTabs; sanitizeDisplaySingleLine (:18) gop CR/

- **gajae.55** Bounded circuit breakers for deterministic faults :: CO (4 breaker): (a) malformed-function-call lien tiep, budget 3, co corrective prompt; (e) Harmony 2 lan abort-retry + 2 lan truncate-and-resume (agent-loop.ts:1215-1216); cong empty-stop / unexpected

- **gajae.60** Steering that interrupts in-flight tool execution :: CO: steering abort tool dang chay, chinh sach interrupt (immediate|wait thay cho abort_tools|finish_tools), soft-vs-hard signal, va 2/3 guard chong orphan (reclaim qua #cancelQueuedMessagePreparation 

- **gajae.63** Fallback chain with explicit attempt accounting :: CO: chain co cau hinh thu tu + origin, state class rieng voi co served (chi bao da thuc su phuc vu), revert policy, seed vi tri khong charge, budget theo model hien tai roi moi consult chain lan cuoi,

- **gajae.64** Retry/compaction scope boundary with local-fault carve-out :: CO: context overflow bi loai cung khoi retry de roi xuong compaction; typed AIError flags la nguon chuan voi regex chi la fallback; veto replay khi co bat ky output khong an toan nao; quyet dinh prese

- **gajae.65** Compaction as a run-terminating event with an external owner :: CO (mot nua): loop KHONG tu viet lai context cua minh cho compaction — quyen so huu nam o session layer, goi tu turn-end hook. THIEU: protocol run-terminating ro rang — khong co maintainContext(contex

- **gajae.67** Token-correction ratio for the keep window :: CÓ phần: một tỷ lệ sửa keep-window tồn tại. THIẾU: (1) omp dùng đúng thương số `promptTokens/estimatedTokens` bị confound mà gajae nói là "never used" — không có `tokenCorrection` do caller cấp từ Usa

- **gajae.68** Script-aware (CJK) token estimation with published measurements :: KHÔNG có estimator script-aware (phân loại block Hangul/Han/Kana/CJK, charging 1 token/ký tự) và KHÔNG có test/bảng số đo o200k. Phần CÓ: vấn đề gốc (đếm thiếu CJK 2-4 lần) đã giải quyết bằng cơ chế M

- **gajae.74** Run-level telemetry with sanitized failure payloads :: CÓ: khung span vòng đời (start → finish/fail) với applyGatewayAttributes tương đương detectGatewayFromHeaders. THIẾU phần cốt lõi là hợp đồng sanitize: failChatSpan ghi err.message NGUYÊN BẢN vào span

- **gajae.75** Per-subagent token and cost log :: CÓ: tổng hợp cost theo 5 bucket (input/output/cacheRead/cacheWrite/total) cho MỖI lần chạy subagent, ghi vào progress.cost. THIẾU: (1) không có bản ghi PERSISTED từng-turn vào token-log.jsonl; (2) rec

- **gajae.85** Bounded, explicit cross-host MCP import (never a live authority) :: CÓ: parse + normalize cả .mcp.json (Claude) và [mcp_servers.*] (Codex) vào hợp đồng MCPServer nội bộ, qua registry provider có gating — và ranh giới home-dir ĐÚNG: helpers.ts:1027-1028 dừng trước os.h

- **gajae.95** ACP (Agent Client Protocol) adapter with MCP startup budgeting :: CO: protocol yes, the distinctive part no. gajae's `ACP_MCP_STARTUP_HEADROOM_MS = 250` subtracted from a semantic-ready deadline, and `ACP_MCP_REQUEST_TIMEOUT_MS = 30_000`, have no counterpart. omp ha

- **gajae.97** Hook convention-normalization với typed diagnostics thay vì reject im lặng :: CO: 3 hệ sinh thái hook được load, 1 bảng taxonomy. THIEU: bảng contract convention×event khai báo authority/awaitBehavior/errorBehavior/timeoutMs/trustRequirement, 9 mã chẩn đoán có cấu trúc, `Normal

- **gajae.104** Điều kiện trả về của hook được schema-check trước khi vào host control flow :: Vector tấn công mà gajae chặn (prototype-pollution / hook chèn field lạ để né check của host) về mặt cấu trúc KHÔNG tồn tại ở omp — không có blind spread, không có spread vào host state. Nhưng đó là h

- **gajae.106** `gjc doctor` với repair có journal, dry-run và precondition :: CO: verb `doctor`, cờ `--fix`, cờ `--dry-run` (cờ dry-run thuộc install actions chứ không phải repair). THIEU: 13 check id phủ runtime/config/permissions/credentials/mcp/native/projection/service; rep

- **gajae.108** Bash allowlist với shell parser tự viết thay vì regex :: Đúng thứ gajae chê: omp dùng regex trên chuỗi lệnh. KHÔNG có tokenizer theo ký tự, không có state machine tilde-expansion, không chặn quote smuggling / command substitution / backslash escape, không c

- **gajae.110** Background job có ownership lease + dead-letter + resume descriptor :: CO: ownership scoping đầy đủ (job/delivery/sink, cancel-wrong-owner = not-found, wait/reap theo owner) + dead-letter bằng drop-with-warn, + retry có backoff. THIEU 4 thứ gajae đặt tên: (1) state machi

