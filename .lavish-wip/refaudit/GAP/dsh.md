# dsh — omp THIEU 41 · CO MOT PHAN 61 · DA CO 7 · tong 109

## Thieu han (41)

- **dsh.5** Profile + bundle: config la YAML patch xep layer
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CO `--profile` nhung no chi chon mot THU MUC cau hinh (`~/.omp/profiles/<name>/`), khong phai he thong YAML patch xep layer th

- **dsh.6** Activation service-availability driven, khong phai thu tu
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co Cordis fiber, khong co khai bao service + injection san sang, khong co comment "row order carries no load semantics". Plu

- **dsh.8** Quy tac ky eng gan voi postmortem
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp CO AGENTS.md 28KB nhieu quy tac, NHUNG khong co duong dan nao tro ve 1 postmortem/agent-note cho tung quy tac, khong co docs/p

- **dsh.9** Design-note lifecycle lam bang file, khong issue tracker
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co 4 thu muc trang thai note, khong co convention ten file ngay+chu de, khong co phan loai feature/architecture/bug-fix. `pa

- **dsh.16** Sticky terminal turn reason
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong ton tai bien `turnEnds`/turn-outcome accumulator de gan pin. `max-tokens` KHONG sticky: moi consumer doc stopReason cua mess

- **dsh.18** Delta-packed durable stream records
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Khong co AssistantStreamRecord/Accumulator, khong co `time0` + `dt[]` + `texts[]` packing, khong co record-level reader giong `ass

- **dsh.19** Durable inbox: queued input is a projection, not memory
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Queue steering/follow-up la array trong RAM. KHONG co log event de fold lai, KHONG co invariant duplicate-message-id, KHONG co `cl

- **dsh.28** Scoped agent event dispatch where subject and scope cannot diverge
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên khác (agentEvents, AgentSubjectEvent, Scoped<Agent>, agentSubject, SubjectEvent, scopedEvents, eventScope, withScope)

- **dsh.43** PTC mode: model writes a program that calls tools
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 10 tên khác. omp chỉ PASSIVE nhận event code_interpreter từ OpenAI server-side tool; không có khả năng PTC của dsh: không c

- **dsh.44** Single-slot capability registry for browser providers
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp chọn mô hình NGƯỢC LẠI chính xác: thay vì một slot duy nhất ném lỗi khi tranh chấp namespace, omp cho phép N browser cùng sống

- **dsh.47** Seam-and-provider cho subagent, 6 backend gồm Codex và Claude Code
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có hệ task/subagent RẤT lớn (executor.ts 172KB, index.ts 61KB, workpool.ts, parallel.ts, isolation-runner.ts, structured-subag

- **dsh.50** Config layers dưới dạng ordered patch rows, không phải merge tree
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp dùng MÔ HÌNH KHÁC: deep-merge layer tree (docs/settings.md:91-136 — 'built-in defaults <- global config <- project config <- C

- **dsh.51** Per-tool 'Model Experience' documentation contract
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là practice tài liệu thuần: mỗi package README có section '## Model Experience' nêu 3 thứ cố định (What the model sees / Token

- **dsh.53** Fiber: máy trạng thái 6 trạng thái + epoch
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có Fiber abstraction, không có 6-state machine (PENDING|LOADING|ACTIVE|FAILED|DISPOSED|UNLOADING), không có epoch = inje

- **dsh.55** Loader: cây entry có địa chỉ id, vá theo id, ghi lại xuống đĩa
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có EntryTree/EntryGroup/Entry. Các hit 'entryId' là entryId của message trong transcript (extension branch API, shared-e

- **dsh.56** Ngôn ngữ YAML !!js — cấu hình là biểu thức sống
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Rỗng hoàn toàn. Hai hit duy nhất cho 'js-yaml' nằm trong packages/coding-agent/src/tools/browser/relay/extension-assets/THIRD-PART

- **dsh.59** Harness tự mô tả chính nó cho model lúc chạy
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có tool introspection cho model. BUILTIN_TOOL_NAMES (builtin-names.ts) liệt kê 31 tool: read, bash, edit, ast_grep, ast_

- **dsh.61** Đăng ký invariant theo gói qua export ./invariant riêng
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có gói runtime-diagnostics/invariants, KHÔNG có InvariantInstaller, KHÔNG có ctx.invariants.register(PACKAGE_NAME, insta

- **dsh.63** Plugin hai mặt (host + client) khai bằng manifest dsh.client
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có manifest client half. PluginManifest (plugins/types.ts:30-48) chỉ khai: name, version, description, tools, hooks, ext

- **dsh.64** Composition point: preset = cả một Loader tree, mount theo revision
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có agent-preset-registry, KHÔNG có PresetTree extends EntryTree, KHÔNG có composition-inventory giữ mọi composition còn 

- **dsh.67** Service isolation realm: cùng một service, nhiều thế giới song song
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có service container. Plugin là manifest-driven (package.json `omp` field: extensions[]/tools[]/hooks[]/commands[]) — pa

- **dsh.68** Bảng feature → cơ chế, tự đặt làm proof obligation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có doc rất đầy đủ nhưng theo SUBSYSTEM (docs/extensions.md 52KB, slash-command-internals.md, approval-mode.md, keybindings.md,

- **dsh.73** Dockable per-session side panel with an invertible split tree
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng ≥5 tên khác (sidebar, splitPane, dockable, applyOp, replay(), tab registry, address grammar) — không có. omp có SplitP

- **dsh.78** Web trust fence and a deliberate refusal of 0.0.0.0
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng nhiều tên (trusted-host, trust fence, loopback check, 0.0.0.0, browser authority). omp không chỉ thiếu refusal — nó CỐ

- **dsh.80** Browser-half plugin runtime for dynamically generated packages
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng ≥4 tên (cordis, define package, plugin runtime, browser half, inject). omp không có khái niệm 'định nghĩa gói động' ở 

- **dsh.81** Per-call sandbox policy carried on the call, with fail-closed refusal
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng ≥5 tên. omp KHÔNG có sandbox thực thi nào cả — không bwrap, không landlock, không seatbelt, không AppContainer. `git g

- **dsh.82** Functional runner probes with per-backend enforcement completeness
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có backend sandbox nào để probe. Không có `enforcement: 'full'|'partial'`, không có `denialSignatures` theo từng backend, kh

- **dsh.83** Strictly-wider escalation ladder resolved BEFORE execution
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có thang leo thang quyền. omp chỉ có phân tầng tool tier read<write<exec và so với một mode đơn (approval.ts:99-124 APPROVAL

- **dsh.86** Monotonic tool guard layered after the extensible pre-execute waterfall
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng ≥4 tên (ToolGuard, ToolLayer, guardReason, monotonic guard). omp chỉ có waterfall đơn: `emitToolCall` (runner.ts:1615-

- **dsh.87** Two independent knobs (sandbox mode x approval policy) bundled into user-facing presets
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp chỉ có MỘT knob. Đã xác nhận: `git grep -rn "permissionMode|permission_mode|PermissionMode" -- packages/` → chỉ 2 hit, cả hai 

- **dsh.88** Bootstrap-environment denylist for discovered .env files
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng ≥4 tên (denylist, blocklist, bootstrapOnly, các tên biến cụ thể). omp NẠP dotenv không có lưới: env.ts:160-166 parse t

- **dsh.90** Schema-declared secret redaction with a write-only-slot sidecar
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp's redaction is entirely PATTERN/VALUE-based, not SCHEMA-declared: StreamRedactor (packages/coding-agent/src/stream/redactor.ts

- **dsh.94** Semantic durability checkpoints (fail-closed) at model and tool boundaries
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: The primitives exist but are never placed at the boundaries dsh names. indexed-session-storage.ts has real append/flush durability

- **dsh.95** Bounded background jobs with per-owner admission and archive-time kill
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: No background-job system exists to bound. The closest neighbours are packages/coding-agent/src/async/job-manager.ts and task/execu

- **dsh.96** Foreground-timeout promotion instead of kill
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp's foreground bash timeout is a hard kill, not a promotion. There is no job registry to promote INTO (see dsh.95), no `promoteO

- **dsh.98** Subprocess runner-failure vs denial classification (outranks correctly)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: There is no sandbox runner in omp at all, so there is nothing whose failure could be confused with a denial. The capability's whol

- **dsh.103** pnpm install-script build approval with a stale-check
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Structurally impossible in omp: it ships no package manager that runs install scripts and has no plugin-manager/profile-manifest l

- **dsh.105** Startup diagnostics written owner-only, with a self-warning header
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: All four sub-capabilities are absent. (1) No owner-only file: the diagnostics dir is created with default umask permissions, not 0

- **dsh.106** Total error-normalization fallback
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Replicated ~8 times, none total. dsh's point is that a hostile thrown value can trap a getter, and normalization is the OUTERMOST 

- **dsh.107** TLS-PSK authentication for forwarded SSH streams
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp has remote SSH, but it delegates entirely to the system `ssh` binary (keys/agent/config) and uses sshfs + sftp for transfers. 

- **dsh.109** Config resolution with lazy `!!js` expressions and volatile-value tracking
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Nothing from this capability is present. No `!!js` expressions evaluated against a loader context at mount time, no `disabled` int

## Co mot phan (61)

- **dsh.1** Service Definition / Consumer / Provider ba cap :: CO seam+provider+consumer day du cho web search. THIEU: bash/shell co 3 package rieng; executor khong nam sau abstract Service nao; khong co DI de inject provider.

- **dsh.2** DI bang TypeScript module augmentation :: CO dung co che declaration merging de mo rong core interface ma khong sua core (6 site production). THIEU hoan toan: khong co Context class / DI container / 138 key `ctx.*`; day la type-widening tren 

- **dsh.3** Subagent backend registry (da co Codex + Claude Code) :: CO seam subagent + `task` tool expose len model + in-process backend + isolation backends + persisted-revive. THIEU: registry backend runtime thay the nhau — khong co Codex app-server protocol, khong 

- **dsh.4** Hook bridge — chay hooks.json cua Claude Code va Codex :: CO typed-Decision interception surface rieng (`pi.on("tool_call")` -> `{ block: true, reason }`, them context, command hooks). THIEU toan bo phan bridge: khong doc duoc `hooks.json` cua Claude Code/Co

- **dsh.7** Generated, boot-verified doc corpus :: CO completeness guard that (test fail neu tool moi khong co doc). THIEU: khong co generator nao BOOT tool tren context roi doc `ctx.tools.schemas()`; docs la viet tay; khong co config-catalog / depend

- **dsh.10** Build face tach host/client o cap tsconfig :: CO host/client tach o 1/20 package (stats) bang tsconfig rieng. THIEU: khong co `tsconfig.host.json` doi chieu, khong co `tsconfig.base.client.json`, khong co co chay build `--env.FACE host|client` si

- **dsh.11** Vendor framework tai chu de thay vi phu thuoc npm :: CO spirit cua capability: so hu layer shell parse (brush-core) nam trong repo, auditable + patchable, LICENSE/README upstream giu nguyen; 2 npm dep critical duoc patch tai cho. THIEU: khong co bang ma

- **dsh.12** Typed append-only session event log as the single source of truth :: CO: log JSONL append-only co type, 16 entry type, cay parentId, crash recovery (TurnRecovery), orphan tool_use synthesis, compaction, fork, replay. THIEU: (a) `SessionEventMap` interface — omp dung di

- **dsh.13** Plugins extend the event vocabulary by TypeScript declaration merging :: CO dung co che declaration merging cho vocabulary, da dung o 3 production site (message vocabulary + compaction session entries). THIEU: khong ap dung cho runtime EVENT vocabulary — `AgentEvent` va `A

- **dsh.14** Surface layer: an ordered, model-visible projection over the log :: CO mot fold rieng biet sinh ra danh sach message co thu tu ma model thay, tach khoi log tren dia, va co compaction-aware rewrite. THIEU: 2 monotonic counter `replaceGeneration`/`contentGeneration` (gr

- **dsh.15** Explicit phase state machine for the loop driver :: CO phan quan trong nhat cua "solves": abort ownership bang IDENTITY GUARD de callback cua controller da chet khong fire lai (agent.ts:1507,1551,1799,1870 + 1513,1531,1538), va wake thay AbortControlle

- **dsh.17** Two-phase assistant settlement: message vs attempt :: CO: mot attempt that bai (error/aborted) van duoc append vao session log truoc khi xu ly tiep → replay duoc full fidelity; abort giua stream phan biet duoc voi clean stop qua stopReason. THIEU: khong 

- **dsh.20** Ordered tool scheduler with live concurrency reclassification :: CO: reclassify-before-start (doc lai `tool.concurrency` tu prepared record, co the function), exclusive barrier chain, synthetic result cho skip/abort (`:3299 createToolSignalAbortedResult`, `:3470/:3

- **dsh.21** Durability barrier before the model call :: CO seam + thu tu "await truoc dispatch": mot pre-dispatch gate co the `return { stop: true, reason }` chan provider call, va host hooks duoc await truoc khi request build. THIEU: KHONG ai flush persis

- **dsh.22** Request-header series management for provider prefix reuse :: CO MUC TIEU (giu provider prompt-cache prefix khi MCP doi tool list) bang 2 co che khac: StablePrefix freeze byte-prefix + invalidate() chu dong, va SentToolDefinitions re-declare tool da rut byte-ide

- **dsh.23** Compaction as a log-bracketed transaction :: CÓ: (a) tool-pair-safe cut point selection, (b) single atomic commit qua một CompactionEntry duy nhất + appendCompaction, (c) rollback wrapper runRecoveryCompactionWithRollback, (d) rewriteEntries là 

- **dsh.24** Context-overflow recovery loop with durable-progress proof :: CÓ: phân loại ContextOverflow đầy đủ (kể cả usage-backed vs payload-rejection 413), vòng retry overflow→compact→re-continue, và QUAN TRỌNG là progress guard: `#compactionCreatedHeadroom()` + `noProgre

- **dsh.25** KV-cache-aligned summarization :: CÓ: 7-section schema đúng như dsh (Goal, Constraints & Preferences, Progress/Done-In Progress-Blocked, Key Decisions, Next Steps, Critical Context, Additional Notes), và compaction-update-summary.md c

- **dsh.26** Provider-owned retry policy executed at a loop extension point :: CÓ (phần policy): retryable set thuộc provider, và retryable.ts:38-40 có ĐÚNG lập luận của dsh về INVALID_CREDENTIAL — "Every 4xx other than 408/429 is terminal: a request the provider rejected as mal

- **dsh.27** Depth-budgeted continuable subagents :: CÓ phần portable quan trọng nhất: depth SUY RA từ persisted parent chain, không phải biến trong process — survive restart, đúng ý dsh. Có cả seen-set chống vòng lặp cha. THIẾU: mô hình "continuable ch

- **dsh.29** Model-free context reduction as a separate concern from summarization :: CÓ: tool-result pruning là module riêng có budget head/tail, có placeholder marker tại chỗ; `shake` và `snapcompact` là hai compaction method không gọi LLM được expose qua COMPACTION_METHOD_CHOICES và

- **dsh.30** Session format as a versioned migration chain :: CÓ: version header thật + chuỗi migration cascade `if (version < N)` đúng hình dạng. THIẾU: tách mỗi thế hệ thành package riêng (dsh: session-format-v0-to-v1, -v1-to-v2…), `releasedV<N-1>SessionFormat

- **dsh.31** MCP tool-name contract: server-qualified, pure, collision-proof public names :: CÓ: tên là hàm thuần của cặp (server, tool), có prefix server, có cap 64 char + hash khi dài, có legacy-alias fallback, có registryKeysForModelName cho dispatch (:527). KHÁC BIỆT CẦN NÓI RÕ: (1) omp d

- **dsh.32** Generation swap: full-set-or-nothing tool registry sync :: CÓ (gần đủ hai guarantee cốt lõi): rollback về thế hệ trước khi mutation throw — model không bao giờ thấy nửa bộ tool; và `runToolRegistryMutation` serialize các refresh nên hai swap không interleaved

- **dsh.33** Outage-budget reconnect supervisor that survives crash loops :: CÓ: ladder + exponential retry vô hạn cho http/sse, `.unref()` để timer không giữ process sống, và một circuit breaker reconnect-storm (RECONNECT_BURST_LIMIT=5 trong 30s) chính là để chặn fork-bomb st

- **dsh.34** Egress-test discipline: one proxy-driven transport test per outbound call site :: CÓ đúng tinh thần kỹ thuật: proxy-driven test chạy transport THẬT qua proxy giả rồi assert route quan sát được — đây chính là loại test mà unit test mock fetch không bắt được. Đã có ít nhất 3 file. TH

- **dsh.35** Process-wide proxy as an installed global, not a plugin :: CÓ đúng hình dạng "library không phải plugin": installGlobalProxyFetch() bọc global fetch một lần ở launcher nên plain fetch() và mọi SDK chạm globalThis.fetch đều qua proxy không cần sửa call site; l

- **dsh.37** Vendored framework with an exhaustive local-patch ledger :: CÓ: patch thật cho dependency (puppeteer-core 34 KB là patch lớn, không phải cosmetic) + crates vendor + THIRD-PARTY-NOTICES 1 MB. THIẾU toàn bộ phần kỷ luật mà dsh đánh giá là giá trị chính: không có

- **dsh.39** Scoped resource registry: first provider mounts shared tools, last unmounts them :: CÓ (một cách khác): tài nguyên MCP được expose qua internal URL `mcp://` + lệnh one-shot `omp read <mcp-resource>`; resolveTargetServer khớp URI chính xác trước khi gọi mạng nên server lạ fail-fast; s

- **dsh.40** git integration through plumbing subcommands, never through a shell or a model-facing tool :: CÓ: plumbing subcommands thật qua một seam tập trung (crates/pi-vcs, có backend git + jj), lỗi là enum có variant first-class thay vì regex stderr (error.rs:1-4 nêu đúng lý do), VcsError mang exitCode

- **dsh.41** Credential-reference seam: config never holds a secret, resolution per request :: CÓ phần cốt lõi: config mang THAM CHIẾU chứ không mang giá trị — cascade.ts:44 resolve() nhận "env var name, '!command', literal" và chỉ materialize lúc dùng; runtime override được ghi rõ "not persist

- **dsh.42** Multi-provider adapter dormant by default, activated purely by user settings :: Chunk tự khai "N/A for omp — đây CHÍNH LÀ packages/ai của omp", nên phần "adapter tồn tại nhưng zero route cho tới khi settings bật" là hiển nhiên đúng: omp có BUILTIN_APIS mount sẵn nhưng route chỉ s

- **dsh.45** Three browser backends, hai trong số là MCP server bọc thành provider :: CÓ: một browser tool với 5 backend nội bộ (puppeteer headless/spawned/CDP-connected, Chrome-extension relay, cmux terminal browser) — registry.ts:24-39 khai đúng union BrowserKind. omp KHÔNG có: provi

- **dsh.46** Seam-and-provider pattern cho shell, subprocess, fs, sandbox, terminal, storage, web :: CÓ: capability registry thật — 14 defineCapability (context-file, extension, extension-module, hook, instruction, mcp, prompt, rule, settings, skill, slash-command, ssh, system-prompt, tool), mỗi cái 

- **dsh.48** Snapshot-per-operation config model cho LLM adapter :: KHÔNG có: mỗi operation capture toàn bộ Config + createModels() collection trước await đầu tiên, config change build collection MỚI thay vì mutate. omp chỉ có comment ở agent.ts:666-668 nói in-flight 

- **dsh.52** Plugin entrypoint: ba hình dạng, một hợp đồng :: CHỈ 1.5/3 hình dạng: extension factory = function (named export hoặc default export). KHÔNG có hình dạng class `new (ctx, config)` và object `{apply(ctx,config)}`. KHÔNG có DI container nên cũng không

- **dsh.54** Mọi đăng ký là effect có disposer — HMR và teardown miễn phí :: CÓ một phần: một số registration trả disposer (composer style, extension handlers có unregister). CÓ `onCleanup(fn)` protected trên chat-block.ts:46 nhưng đó là TUI component teardown hook, KHÔNG phải

- **dsh.57** 33 seam: interface + registry provider có tên + disposer + mã lỗi chọn provider :: CÓ phần lõi: capability registry với provider có tên + priority + dedup key + source metadata. NHƯNG thiếu 3/4 trong contract: (1) registerProvider trả void, KHÔNG trả disposer (dsh yêu cầu register*(

- **dsh.58** Bốn bảng 'tại sao' đều SINH TỰ ĐỘNG và có freshness gate :: KHÔNG có 4 bảng sinh tự động: không có docs/capability-seams.md (find rỗng), không có docs/subsystems/*.md (find rỗng), không có tool-catalog.md sinh từ ctx.tools.schemas() (chỉ có 1 test file thủ côn

- **dsh.60** 89 UI slot có hợp đồng sinh tự động (cardinality, scope, occupants, replaceRisk) :: CÓ: extension UI registration bằng key (setStatus/setWidget với key) + composer shape registry (composer-shape-registry.ts, 8 built-in shape, extension đăng ký thêm, installExtensionComposerShape trả 

- **dsh.62** Hook: một protocol chung + bridge ra dialect bên ngoài :: CÓ MỘT NỬA: protocol hook nội bộ rất giàu — HookEvent union 18 loại (SessionEvent, ContextEvent, BeforeAgentStart, AgentStart/End, TurnStart/End, AutoCompaction, AutoRetry, Ttsr, TodoReminder, ToolCal

- **dsh.65** Volatile config: commit tham chiếu sống mà không remount :: CÓ một nửa: omp có live settings với layer merge + revision + change listener (settings.ts:548 'Monotonic revision of merged layers', :575 'Changes whenever a live API mutates a persisted layer') — đọ

- **dsh.69** Per-platform shortcut registry with a configurable/fixed split :: CÓ: registry khai báo bằng declaration merging (keybindings.ts:7-44 interface `Keybindings` + app-keybindings.ts:70 `declare module './keybindings'`), user override qua ~/.omp/agent/keybindings.yml, p

- **dsh.70** Slash commands that never become a model message :: CÓ (một nửa): handler trả `undefined | {consumed:true} | {prompt}` — types.ts:44-49 ghi rõ '`void` … treated as handled; no LLM prompt'; extension command chạy ngay và `prompt()` return (docs:192-194)

- **dsh.71** Composer trigger pipeline with a grouped, sticky-dismiss candidate menu :: CÓ: nhiều nguồn trigger cùng lúc (slash `/`, `@` mention, `#` GitHub ref + prompt action, `^`, emoji, skill) gộp qua CombinedAutocompleteProvider; khớp là subsequence không phân biệt hoa thường có chấ

- **dsh.72** Slot system where declaration == render authorization :: CÓ: contribution point thật sự có validate lúc đăng ký — registerComposerShape throw TypeError nếu id rỗng/không trim, throw nếu label rỗng, throw nếu cố thay built-in (loader.ts:277-289). Disposer củ

- **dsh.74** Settings as a single served-namespace mirror with conditional page registration :: CÓ: MỘT tài liệu settings duy nhất đọc qua config registry, `isConfigured()` phân biệt default/explicit/env-fallback (registry.ts:759-760), UI là một selector phẳng gom theo `ui.tab`/`ui.group`. THIẾU

- **dsh.75** Pre-paint theme bootstrap (no flash of wrong theme) :: CÓ: light/dark/system tương đương — phát hiện 3 tầng (OSC 11 luminance → COLORFGBG → macOS appearance fallback khi Zellij), theme JSON bundled (dark.json/light.json), selector có live preview. Đây là 

- **dsh.76** Shell overlays that own input while open, and a quit gate driven by live host state :: CÓ (ý giảm còn tối thiểu mà chính dsh nêu: 'a modal stack owns stdin'): overlayStack là LIFO, focus nằm trên overlay nên toàn bộ input kể cả Ctrl+C đi vào overlay; overlay ẩn bị đẩy focus lên topmost 

- **dsh.77** Plugin Manager as a first-class user surface, separate from Settings :: CÓ: `/plugins` là bề mặt người dùng hạng nhất, TÁCH khỏi /settings, có scope user|project, list npm + marketplace, enable/disable gọi `runtime.reloadPlugins()`. Backend dùng chung là PluginManager/mar

- **dsh.84** Approval seam that fails closed on every bad answerer :: CÓ (fail-closed thật, ở cả hai đường): ACP path — outcome không thuộc union thì throw, `PERMISSION_OPTIONS_BY_ID` miss thì throw, cancelled/abort thì throw (session-tools.ts:979-990); TUI path — `!run

- **dsh.85** Turn-enclosed durable audit pair for every approval :: CÓ HÌNH DẠNG: một cặp event asked/resolved được phát đúng một lần mỗi lần hỏi (wrapper.ts:328 và :340, phát trong `hasApprovalHandlers` guard). THIẾU TOÀN BỘ PHẦN BỀN: (1) cả hai chỉ là extension even

- **dsh.91** Layered credential precedence where the environment is explicitly read-only :: HAS: an explicit, documented, inspectable precedence cascade with a machine-readable `source()`/`describe()` classifier. MISSING/INVERTED: (a) env is FIFTH in omp's order, not first — dsh makes inheri

- **dsh.92** Signed authority-bound browser session cookie + Host/Origin rebinding fence :: HAS: an Origin fence on a loopback server (relay/server.ts:92 rejects ANY Origin on /cdp so a web page cannot drive the relay; :98-100 restricts /ext to chrome-extension://), a Host sanity check (:81-

- **dsh.93** Kernel-level session write lease (flock / named semaphore), never an expiring lock :: HAS the kernel arbiter and is stronger than dsh on artifact hygiene: Linux uses abstract Unix sockets and Windows a `Global\` named mutex, so NEITHER leaves a filesystem artifact (dsh's flock path doe

- **dsh.97** Cooperative, scoped timeout with signal swap-and-restore :: HAS: (a) the "mistyped name is impossible" property — `ToolWithTimeout` is a TS key union over a const record and each tool hardcodes its own `clampTimeout("bash"|"eval"|…)` call, so no string can be 

- **dsh.99** Fresh-canonicalize-then-delegate fs fence (TOCTOU-narrowed, honest about its limits) :: HAS: deepest-existing-ancestor realpath resolution with a dangling-symlink refusal (a better shape than dsh's, which chases the chain), AND a stronger atomic fence than dsh on the cursor download path

- **dsh.100** Hook protocol: hooks never fail a turn, but PreToolUse can still deny :: HAS the "PreToolUse can deny" half: a real pre-tool interception point (`tool_call` emitted before execute) whose `block: true` throws and stops the tool, plus post-tool result rewriting. The failure 

- **dsh.101** Delegated-child permission pinning :: HAS the pinning itself, applied to a real subagent system (task/executor.ts is 172K, plus spawn-policy.ts and read-only-policy.ts). omp pins `"tools.approvalMode": "yolo"` — same intent as dsh's `appr

- **dsh.102** Telemetry that is off by default and ships its own redaction waterfall :: HAS "off by default", and more strongly than dsh: omp ships no session-log export at all, so there is no default full-log upload for a deployment to forget to guard. `omp stats` is a purely local dash

- **dsh.104** Process-tree quiescence before touching a locked profile :: HAS the mechanism, better than dsh in two respects: omp re-walks the live descendant tree before EACH signal wave (so grandchildren spawned during the grace period are caught) and prunes whole PROTECT

