# senpi — omp THIEU 34 · CO MOT PHAN 52 · DA CO 24 · tong 110

## Thieu han (34)

- **senpi.3** dropFailedAssistantTurns — cache-prefix-preserving failure eviction
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥4 tên khác (dropFailed / dropErroredTurns / pruneFailedTurns / stripFailed / evictFailed / dropAborted) — không có transfo

- **senpi.8** Base64 and image weighting in the token estimator
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp đi kiến trúc khác: `packages/agent/src/tokenizer.ts:12-21` map `ModelTokenizer` → native BPE encoder của pi-natives (ClaudeV3/

- **senpi.13** Canonical-path file mutation queue with in-slot postMutate
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 6 tên thay thế (mutationLock, mutateQueue, serializeWrites, writeCoordinator, mutationCoordinator, postMutate) — rỗng. `pac

- **senpi.18** Warm compaction anchor validated by entry identity
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 5 tên thay thế. omp CÓ `CacheWarmer` (agent-session.ts:396, :1004, :1561-1568, :4838-4842) nhưng đó là prompt-cache warmer 

- **senpi.19** Post-compaction restoration with a hard token budget
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 5 tên thay thế. omp giữ lịch sử gần đây nguyên văn sau compaction (compaction.ts:1435-1468 turn-prefix) và nhánh summarizer

- **senpi.20** Durable lane runtime: 13-state explicit machine over an append-only session
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 6 tên thay thế. omp có append-only context log (`packages/agent/src/append-only-context.ts`, wire tại `agent.ts:487 #append

- **senpi.24** Host-authorized session-worker credit (SharedArrayBuffer blocking)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 nhóm tên: session-worker / reservation / credit — không có. Có một cross-process session-file mutex (session-storage.ts:3

- **senpi.26** Per-directory changes.md tracker với upstream-pin coverage gate
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên khác: changes.md / CHANGES.md / DIVERGENCE + fork-note/patch-log/upstream-pin. Không có tracker per-directory, không 

- **senpi.28** Vendored Codex app-server protocol với handwritten facade
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: app-server / generated / codex-vendored. omp implement Agent Client Protocol bằng tay (acp-agent.ts 98KB + acp-event

- **senpi.29** Extension-first architecture với một ordering array duy nhất
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có extension in-tree nào — mọi feature nằm thẳng trong core, extension chỉ là bề mặt cho user/plugin. Thứ tự load là thứ

- **senpi.30** Fork-publish name rewriting (tên upstream không bao giờ lên npm)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: registry-packages / prepare-publish / scope-rewrite. omp publish thẳng dưới tên `@oh-my-pi/*` với manifest name thật

- **senpi.31** Ba package manager song song + self-test cho manifest rules
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Bun-only. Đúng cái footgun mà senpi ghi lại ("`npm run --workspaces`... hardcode npm") đang hiện diện nguyên trạng trong package.j

- **senpi.34** Executable evidence gate: không có QA receipt thì không commit
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: .agents/skills island / qa-evidence+local-ignore / tracked-harness-artifacts-audit. Không có package QA riêng, không

- **senpi.35** Merge-gating PR claim labels
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 tên: will-review / review-claims / review-claim-gate. Không có workflow review-claims.yml, không có label claim, không có

- **senpi.46** Slash-command dispatch regression test
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên khác trước khi kết luận no. omp có test tương đương cho CLI verb (cli-argv-routing.test.ts, plugin-verb-launch-leak.t

- **senpi.47** $skill token invocation alongside /command
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm bằng 3 tên: dollar-invocation, getMentionRanges, skill trigger prefix. omp chọn thiết kế ngược lại: skill dùng `/skill:` (c

- **senpi.50** Brand layer: one product name, many deployment identities
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm 4 tên: BRAND, APP_NAME, envPrefix, configDir. omp đơn giản hơn nhiều: tên sản phẩm hard-code 'omp' ở 4 chỗ, không có khái n

- **senpi.52** Alt-screen transcript search
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có fullscreen transcript viewer (agent-hub.ts:501 `showOverlay(viewer, { fullscreen: true })`) và có fuzzy filter trên list, n

- **senpi.57** Per-provider account footer with HRW slot prediction
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm 3 tên: rendezvous, HRW, readBigUInt64BE, cộng footer-data-provider. omp có hệ credential pool/rotation (packages/ai/src/aut

- **senpi.59** Shortest-path shortcut overlay on empty editor
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm 4 tên khác: shortcut-overlay, shouldShowShortcutOverlay, helpPanel/keysOverlay, và phím `?` trong input controller. omp có 

- **senpi.61** MCP 3-mode exposure policy (direct / search / proxy) with an auto threshold
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có chính sách direct/search/proxy, không có auto threshold, không có tool promotion. Hai cơ chế hẹp hơn tồn tại nhưng không 

- **senpi.62** Rug-pull defense on list_changed
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm 4 tên: activeSet, inactive/promptToEnable, tombstone, allowedTools/enabledTools. omp refresh catalog và đưa tool mới vào ac

- **senpi.65** Command-substitution rejection in MCP config values
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã tìm 3 tên: McpConfigValidationError, validateServerConfig, và trực tiếp các pattern `$(` / `startsWith("!")`. Guard tường minh 

- **senpi.74** Lazy per-provider API module loading
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥3 tên: `*.lazy.ts`, `lazyApi`, `await import(` trong packages/ai. Không có. Tất cả wire protocol được static-import vào `s

- **senpi.84** bash_input classified into the same bash permission class
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥4 tên: `bash_input`, `bash_output`, `kill_bash`, `bash_resize`, và cả `stdin`/`writeStdin` toàn bộ tools/. omp không có pe

- **senpi.85** external_directory as a separate permission class
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥5 tên: `external_directory`, `externalDir`, `allowedPaths`, `protectedPaths`, `isOutsideWorkspace`/`checkCwd`, `approvePat

- **senpi.86** Content-hash hook trust with scope separation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có executable command hooks — hook là extension JS in-process (`createHookAPI` tại hooks/loader.ts:72), không phải subpr

- **senpi.87** Hook environment allowlist instead of inheritance
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥4 tên: `MINIMAL_INHERITED_ENV`, `buildHookEnvironment`, `HOOK_SOURCE`/`HOOK_EVENT`, và env-handling trong hooks/runner.ts.

- **senpi.93** Project trust gate for config resources, defaulting to ask
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Quyết định sản phẩm có chủ đích, không phải thiếu sót. types.ts:488-496 nói rõ giữ signature chỉ để tương thích extension cũ. Khôn

- **senpi.95** Approval decision cascade for batched pending prompts
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Hai cơ chế gần nhưng KHÔNG phải: (1) wrapper.ts:375 chỉ 2 lựa chọn — không có "always" nên không thể sinh cascade. (2) session-too

- **senpi.102** Builtins are plugins
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp giữ ranh giới host/plugin: slash-command builtin là module TypeScript import trực tiếp, không qua ExtensionFactory/loader. Đún

- **senpi.106** Declarative JSON+shell hooks subsystem
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có surface hook khai báo bằng JSON + shell command. Toàn bộ hook là TypeScript module export default (HookFactory) nạp q

- **senpi.107** Chord facet system with real disposal
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có hệ thống DI facet nào. Mọi từ khóa tìm ra đều nghĩa khác: 'chord' = tổ hợp phím (tools/computer/worker.ts:159 chordKe

- **senpi.109** Command collision renaming
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: CHỈ có nửa thứ hai, và chỉ trên đường ACP. Đổi tên KHÔNG có ở đâu: hai extension cùng đăng ký `foo` thì extension sau âm thầm ghi 

## Co mot phan (52)

- **senpi.1** Two-tier agent loop with draining steering/follow-up queues :: CÓ: vòng lồng 2 tầng đúng hình dạng, steering poll ở 3 điểm biên, follow-up drain ở stop boundary, cộng thêm non-interrupting `asides` và provider live-steering (OpenAI Responses `response.steer`) — t

- **senpi.4** Two-stage retry profile (provider request vs. assistant turn) :: CÓ: hai ngân sách độc lập thực sự tồn tại và được tách ở đúng tầng — transport (`maxProviderErrorRetries`) vs turn (`retrySettings.maxRetries` + 3 hằng per-kind), kèm reset budget khi model đổi (reset

- **senpi.6** Structured overflow detection + bounded shrink-retry :: CÓ: (a) ~24 pattern overflow có gắn provider (Anthropic/Bedrock/OpenAI/Google/xAI/Groq/OpenRouter/llama.cpp/LM Studio/MiniMax/Kimi/z.ai/Ollama + fallback), và một lớp NON-overflow tách riêng qua `hasT

- **senpi.7** Deterministic no-LLM context reduction :: CÓ: hai lớp giảm context thuần deterministic, không LLM, đúng tinh thần senpi.7 — `shake` thay tool-result text và khối fenced/XML lớn bằng placeholder (giữ `protectTokens`/`minSavings`, trả tổng `sav

- **senpi.9** Tool-call/result pair repair and request-boundary guard :: CÓ: sanitize tại biên wire cho 2 dialect — Anthropic (anthropic.ts:5135-5165, có trích nguyên văn lỗi 400 "tool_use ids were found without tool_result blocks immediately after" + issue #544, và fast-p

- **senpi.11** Tool name auto-correction with a model-only audience :: CÓ: nửa "gợi ý" — `suggestToolNames` khớp theo segment đuôi `__`/`_` và `formatToolNotFoundMessage` sinh "Did you mean X?"; thêm lớp phòng vệ namespace riêng cho MCP (tool-bridge.ts:469-520 re-mint `m

- **senpi.14** Size-proportional output backpressure (AdaptivePublisher) :: CÓ: contract quan sát được phần lớn — chỉ publish trạng thái mới nhất (boolean `#renderRequested`, không hàng đợi trạng thái trung gian), một trailing timer duy nhất bảo đảm publish dứt điểm, và delay

- **senpi.15** Empty-assistant recovery with a per-model thinking commit policy :: CÓ: cơ chế recovery empty-assistant (2 tầng: replay-safe stream retry ở packages/ai + empty-stop retry ở tầng turn), có typed boundary `toolcall_start/end` không commit nên retry được khi stream chết 

- **senpi.16** Separate stream-start and stream-idle timeouts :: CÓ: hai timeout tách bạch hoàn toàn — `streamFirstEventTimeoutMs` (chờ event đầu, có watchdog tắt riêng qua env `PI_STREAM_FIRST_EVENT_TIMEOUT_MS=0`) và `streamIdleTimeoutMs` (giữa các event), với biế

- **senpi.17** Loop guard: identical / similar / cycle detection with escalation :: CÓ: detector `identical` — canonicalize args (loại field intent, sort key) rồi đếm run liên tiếp giống hệt, có exemptTools, và redirect model ra khỏi vòng lặp. THIẾU 2/3 detector: KHÔNG có `similar` (

- **senpi.21** Session fork with namespace-aware state projection :: CÓ: fork session thật — `forkFrom` copy file session, dựng header `parentSession`/`providerPromptCacheKey`, có `resetInheritedCost`, copy artifact, và throw `ForkSourceNotFoundError` khi thiếu nguồn (

- **senpi.22** Subagent as a spawned CLI process with three dispatch modes :: CÓ: đúng triết lý "spawn tiến trình CLI" — child là tiến trình `omp` riêng (omp-command.ts:11-26 resolve `omp`/`omp.cmd`/`PI_SUBPROCESS_CMD`), discovery đúng convention `~/.omp/agent/agents/*.md` + `.

- **senpi.25** Autonomous loop scheduler (wakeup over an agent session) :: CÓ: /loop thật với budget iterations|duration, continue-condition bằng shell command, inline prompt, thông báo trạng thái có limit/remaining/condition. THIẾU toàn bộ phần scheduler của senpi: cadence 

- **senpi.27** Distributed AGENTS.md tree (73 file) như một bản đồ phân cấp :: CÓ: root AGENTS.md 28KB có bảng Package Structure + Code Quality + Commands + Testing, và đúng 1 nested duy nhất. THIẾU: cây 73 file xuống từng thư mục; thiếu rule "đọc file gần nhất trước khi sửa"; t

- **senpi.32** Test suite lớn hơn cả source nó test :: CÓ: tỉ lệ file test > file src (đạt hoặc vượt senpi), 148 regression test đặt tên theo issue number đúng convention senpi, có thư mục test/live opt-in. THIẾU: subtree `test/suite/regressions/` có AGEN

- **senpi.36** CalVer lockstep versioning với ngoại lệ được code-enforce :: CÓ: lockstep enforcement thật, fail-fast nếu lệch. THIẾU: (a) KHÔNG phải CalVer — là semver phẳng 18.4.0, không có scripts/calver.mjs; (b) không có danh sách ngoại lệ khai báo một chỗ kèm lý do + issu

- **senpi.37** Extension-authoring curriculum dưới dạng ví dụ chạy được :: CÓ: thư mục ví dụ + README phân loại + extension thật resolve được dependency riêng. THIẾU: quy mô (9 ví dụ vs 60 của senpi, 13 file vs 115). Đáng chú ý: README liệt kê nhiều file KHÔNG tồn tại trong 

- **senpi.38** Model/provider layer split theo trục (metadata vs wire) + faux provider :: CÓ: split theo trục ở mức PACKAGE — metadata/model identity ở packages/catalog (models.json + provider-models/descriptors.ts + KDL rules), wire/streaming ở packages/ai. THIẾU: cặp file `<vendor>.ts` +

- **senpi.40** Fully rebindable keybinding layer với live help re-render :: CÓ: map tập trung có type, namespace, user override từ config file, và hint render động qua formatKeyHint (chống drift ở footer/CLI). THIẾU phần trọng tâm của senpi: `buildKeybindingTables()` dựng /he

- **senpi.41** Extension-replaceable chrome: footer, header, widgets, editor, working indicator :: CÓ: footer, header, widgets trên/dưới editor, toàn bộ input editor, custom overlay, working message, title — 6/7 bề mặt. THIẾU: (a) `ReadonlyFooterDataProvider` — factory chỉ nhận `(tui, theme, keybin

- **senpi.43** Three-tier render scheduler (forced / input-expedited / fps-throttled) :: CÓ 2/3 tier: forced (scheduleImmediate, bỏ qua mọi timer) và fps-throttled (30fps cap + adaptive backpressure theo frame cost — bản nâng cấp so với cap tĩnh của senpi). THIẾU tier "input-expedited" bỏ

- **senpi.44** Session tree với folding, filtering, label editing, branch navigation :: CÓ: fold/unfold, đúng 5 filter mode, persisted default filter, horizontal viewport dùng chung cho cả cửa sổ (:581,597), cây branch từ session history, có bench (bench/session-tree-nav.bench.ts). THIẾU

- **senpi.45** Codex app-server protocol compatibility layer :: CÓ: mô hình 'protocol compat layer + app-facing facade' — packages/utils/src/acp/ định nghĩa protocol/transport/connection, acp-agent.ts là facade ~33 method, isolateProtocolStdout() (acp-mode.ts:43) 

- **senpi.49** Two screen models over one component set :: CÓ: hai mô hình buffer (normal scrollback vs alt buffer), bộ component layout dùng chung (stack/row/split-pane, ScrollView, OverlayPanel), và tài liệu giải thích vì sao khác nhau. THIẾU: một mô hình m

- **senpi.51** Account display names layered over opaque credential IDs :: CÓ: một lớp display label cho account (derive tự động từ email/org, hiển thị trong pin selector và header /usage). THIẾU: user tự đặt tên human label cho account; chuẩn hóa NFC + collapse whitespace +

- **senpi.56** Working indicator is fully user/extension-configurable :: CÓ: đổi message qua extension API, và override spinner frames qua theme (JSON asset, có schema). THIẾU: `setWorkingIndicator` (custom frame array từ extension), `setWorkingVisible` (hide-all), static-

- **senpi.63** Single-flight MCP session attach + history rehydration :: CÓ (mạnh): single-flight theo từng server qua #pendingConnections, cộng waitForPendingConnections xử lý đúng startup race mà senpi mô tả. THIẾU: `#rehydrateFromSessionHistory` / `maybeRehydrateFromHis

- **senpi.64** OAuth 2.1 for MCP with hardened cross-process token storage :: CÓ: PKCE S256, RFC 8707 resource binding, loopback callback có validate, 0700/0600. THIẾU: (a) `client_credentials` cho headless M2M — `rg -n 'client_credentials' packages/ai/src packages/coding-agent

- **senpi.66** Deterministic collision-safe MCP tool naming under a hard 64-char cap :: CÓ: cap 64 cứng, hash deterministic (giữ ổn định qua restart, không phá prompt cache), fold `-`→`_`, phát hiện + log collision với winner deterministic. KHÁC ở chính sách giải quyết: senpi RENAMES too

- **senpi.67** Lazy SDK boundary guarding CLI startup cost :: Có: lazy-load thật ở CLI entry + memoized loader (`loadXtermTerminal`). Thiếu: (1) không có MCP SDK ngoài để hoãn; (2) không có `memoizeLoader` dùng chung cho tập submodule; (3) quan trọng nhất — KHÔN

- **senpi.68** MCP lifecycle modes and idle shutdown with transparent reconnect :: Có: reconnect tự động có ladder + backoff (manager.ts:110-130 mô tả `retryBaseMs`→`retryMaxMs`), transparent reconnect khi tool call gặp connection chết (tool-bridge.ts:738/867/892), `DeferredMCPTool`

- **senpi.69** Shared host-level MCP connection registry with reference-counted leases :: Đạt đúng mục tiêu: `sdk.ts:2351-2354` — "Only top-level sessions own the global MCPManager. Subagents already receive the parent's manager via `options.mcpManager`"; `sdk.ts:4277-4278` chặn subagent d

- **senpi.70** MCP output guard with spill files :: Có phần lớn: overflow spill ra FILE thay vì cắt cụt, model đọc lại qua `artifact://<id>`, có head+tail middle-elision + cảnh báo dòng bị elide. Thiếu: (1) KHÔNG có `outputGuard{maxBytes,maxLines,maxTo

- **senpi.71** Form-only MCP elicitation that works headless and over RPC :: Có ở đường ACP: `elicitFormFromAcpClient` là form-only, có signal/timeout, `isAcceptedElicitation` thu hẹp action, có fallback khi không UI. Thiếu ở đường MCP: client từ chối mọi method lạ với -32601,

- **senpi.73** 47-provider / 9-wire-protocol LLM surface with a two-tier registry :: Có: reserved builtin names (không override được), provenance tag `sourceId`, `unregisterCustomApis(sourceId)` rút theo nguồn — đúng tinh thần "attributable + withdrawable". Thiếu phần cốt lõi: KHÔNG c

- **senpi.75** Bun-vs-Node fetch split with a testable install decision :: Có hình dạng: quyết định cài là guard có test seam (`if (!proxyUrl) return;` + `__resetGlobalProxyFetch`), quyết định bypass là hàm thuần `shouldBypassProxy(urlObj)`, có test thật ở packages/ai/test/p

- **senpi.76** PTY-backed persistent terminal as a separate extension from one-shot bash :: Có: PTY thật qua native Rust (`PtySession`), overlay TUI `BashInteractiveOverlayComponent`, xterm lazy-load, `OutputSink` cho output; `bash` có `name?` để spawn service dài hạn qua `launch/broker.ts` 

- **senpi.77** Code-mode polyglot kernels (jl / js / py / rb) behind an HTTP bridge :: Có 2/4 ngôn ngữ (js, py) với kernel base + session registry + tool-bridge, và `budget-bridge.ts` cho run budget. Thiếu: Julia và Ruby hoàn toàn; HTTP bridge (`bridge/`, `bridges/`); memory protocol; s

- **senpi.78** Transport-neutral CBOR session protocol (pi-protocol / pi-client / pi-wire) :: Có phần "transport-neutral": `packages/wire` là contract dùng chung cho host CLI + browser guest (collab-web) + relay, wire format độc lập transport. Thiếu: format là JSON-in-encrypted-envelope, KHÔNG

- **senpi.82** Permission rule cascade with 9-level last-match-wins precedence :: Có: (1) rule match→approval cho bash (`bash.patterns`), có phân tích segment để `cd x && rm -rf /` vẫn bị bắt (bash.ts:284-310, dùng `tokenizeShellSegments`); (2) `tools.approval.<tool>` + `tools.appr

- **senpi.83** Tool-aware permission parser registry :: Có extension point: mỗi tool tự khai báo `approval` là hàm nhận args, nên đây là chỗ đúng để cắm parser. Thiếu phần cốt lõi: KHÔNG có `ParserRegistry` map tool→parser sinh nhiều `PermissionRequest`; a

- **senpi.89** RPC daemon socket: 0600 + 32-byte secret + timing-safe handshake :: ĐÚNG 3/4: 0700 dir + chmod 0600 socket + 32-byte secret + timingSafeEqual. THIẾU: (a) secret KHÔNG nằm trong file `<socket>.secret` 0600 mà nằm inline trong discovery metadata JSON — thư mục 0700 nên 

- **senpi.90** Socket identity guard so shutdown removes only its own socket :: CÓ probe-before-unlink (nửa đầu): connect thử, ECONNREFUSED→stale→unlink, connect thành công→abort với message rõ. THIẾU nửa sau: không có statSocketIdentity() và không so-đối chiếu identity trước khi

- **senpi.91** Single shared lockfile policy with a documented reason :: CÓ API lock trung tâm với own-loop + abort quan sát giữa các attempt (throwIfAborted :46, :60) — đúng phần khó nhất. KHÁC BIỆT: (a) omp KHÔNG dùng proper-lockfile → không có stale/update mtime, không 

- **senpi.92** Atomic 0600 credential store write :: CÓ kỹ thuật atomic-0600-write chuẩn ở nhiều nơi — còn cẩn thận hơn senpi ở chỗ dùng `open(..., "wx")` chống hai writer dùng chung temp path, và có `handle.sync()` trước rename. NHƯNG credential store 

- **senpi.94** Extension system as the permission enforcement substrate :: CÓ: extension `tool_call` handler veto được (return {block:true, reason}) qua shared-events, ví dụ thật ở examples/hooks/permission-gate.ts; tool_approval_requested/resolved là event thật của bus (typ

- **senpi.96** Fail-closed websocket auth with explicit empty-token rejection :: CÓ fail-closed ở chỗ nguy hiểm nhất: broker.ts:1540 throw khi token rỗng trước khi listen, client.ts:76-77 coi file rỗng là không hợp lệ rồi regenerate. CÓ timing-safe compare thật (http.ts:89-95 vòng

- **senpi.97** Secret-answer redaction before crossing the process boundary :: KHÔNG có approval-redaction / readSecretQuestionIds / redactSecretAnswers — app-server không tồn tại nên câu hỏi "payload approval nào mang secret" không sinh ra. omp CÓ hệ thống redaction mạnh hơn th

- **senpi.98** Crash and stray-stdout logging that cannot corrupt the TUI or leak secrets :: CÓ: chặn fd2 của TUI chính xác hơn senpi (dup/dup2 qua bun:ffi, redirect VÀO log file omp chứ không /dev/null, restore trước mọi fatal print); crash path không đổi hành vi (postmortem.ts:519 `try { fs

- **senpi.99** Permission observability events :: CÓ đúng hai event với toolCallId làm correlation key. KHÁC 3 điểm: (1) tên là tool_approval_requested/tool_approval_resolved, không phải permission_asked/permission_replied; (2) KHÔNG có emitter inter

- **senpi.108** Config-driven hot reload :: CÓ watch + debounce + keep-last-good (file parse hỏng giữ config đang chạy — settings.ts:972 "a file that fails to parse or validate keeps its last good"), và watch theo thư mục chứ không theo file nê

- **senpi.110** Package manifest for multi-resource plugins :: CÓ manifest đa-resource trong package.json (field `omp` hoặc `pi` — types.ts:26 comment "Plugin manifest from package.json omp or pi field"), mở rộng hơn senpi ở chỗ có `features` cho selective instal

