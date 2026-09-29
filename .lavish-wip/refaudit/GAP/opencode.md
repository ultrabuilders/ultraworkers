# opencode — omp THIEU 35 · CO MOT PHAN 61 · DA CO 22 · tong 118

## Thieu han (35)

- **opencode.3** Per-runtime module resolution via an imports condition map
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có `imports` condition map, không có file variant theo runtime, không có split FFI/WASM/native. Native binding resolve M

- **opencode.8** Encode-once event feed with independent per-connection bounded queues
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên khác (SSE, EventSource, PubSub/EventBus, bounded/dropping queue) — không có. omp không có server mode phát event cho 

- **opencode.9** AST-level architecture lint via ast-grep, with the general linter disabled
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có bất kỳ rule lint kiến trúc nào ở tầng AST: không `no-star-import`, không `no-import-alias`, không test fixture + `__snaps

- **opencode.10** Authority table + decision records instead of implementation checklists
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: THIẾU cả ba trụ cột: (a) bảng authority "class of fact → single owner" — AGENTS.md có một số tuyên bố sở hữu rải rác (Central Util

- **opencode.13** Explicit typed-error vs defect discipline in tool execution
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có phân biệt abort (`AgentBusyError`, `createToolScopedAbortReason`, `SteeringInterruptSource`, `AsideInterruptSource = "irc" 

- **opencode.16** Replayable Location-scoped catalog transforms (historical decision)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là một record quyết định được CỐ Ý giữ lại dưới mục Historical để câu hỏi "tại sao không phải global service" không bị tranh l

- **opencode.18** Write-ahead execution claim (crash recovery as a DB property)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 4 tên: claim/commit, suspended/resume, in-flight, crash-recovery sweep. Không có. Điểm mấu chốt: omp không có transactional

- **opencode.29** Max-steps as a forced text-only final step that preserves the cache prefix
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp KHÔNG có khái niệc max-steps trên agent loop, nên không có bước cuối text-only ép buộc. Có `/loop` với loopLimit (iterations|d

- **opencode.36** Effect-TS as the runtime substrate for the whole core
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp dùng TS thuần + AbortSignal, không có Effect. Điểm cần ghi nhận là omp CÓ phần tương đương về mặt contract (interrupt vs fail 

- **opencode.37** Unified command model — one declaration is simultaneously a keybind, a palette entry, and a slash command
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Ba bảng song song, đúng cái drift mà opencode muốn xoá: keybindings (packages/tui/src/keybindings.ts + app-keybindings.ts, ~44 `ap

- **opencode.39** Timed leader key as the primary chord namespace
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có leader key, không có timed sequence, không có chord namespace. Keybinding là flat map `KeyId -> action` (`KeybindingD

- **opencode.40** Palette-as-discovery + deliberately minimal help dialog
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Ngược hẳn opencode. omp KHÔNG có command palette, nên không có palette-as-discovery. Về help thì omp chọn hướng NGƯỢC LẠI: có `hot

- **opencode.46** Session tabs: resizable, scope-aware, unread markers, history, quick slots
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp chỉ có session picker 95 dòng. Không có: tab strip/sidebar cho session, drag-resize handle, per-tab unread, tab history back/f

- **opencode.51** Declined bindings giữ lại làm schema no-op để tương thích config cũ
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có convention giữ key đã bỏ. Hệ quả: vì omp parse keybindings.yml một cách permissive và bỏ qua key lạ, nên xoá một keybind 

- **opencode.57** Replay-based registry substrate (State.create)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có: reads rebuild bằng replay transform, scoped registration + finalizer, version-guarded rebuild loop (restart khi transfor

- **opencode.58** Content-addressed plugin activation giữ prefix + fallback
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có revision token per plugin, không có identity contract (id, revision), không có cut-point theo index giữ prefix sống, khôn

- **opencode.59** Readiness latch để consumer không thấy registry nửa vời
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: `no` mang tính "vấn đề mà nó giải không tồn tại ở omp": extension load được `await` inline TRƯỚC khi session tồn tại, nên không có

- **opencode.68** Transform digest-fingerprinted hot reload of a plugin's transitive import graph
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHÔNG có watcher trên nguồn extension/plugin, KHÔNG có sha256 digest từng file, KHÔNG có short-circuit "unchanged → giữ module cac

- **opencode.69** Revision derived from content mtime, not a counter
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có khái niệm (operation, revision) cho reload, nên cũng không có revision suy từ mtime. mtime duy nhất là query `?mtime=

- **opencode.72** Debounced, coalesced, serialized plugin re-activation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có 6 trigger stream hội tụ, không debounce 100ms, không generation counter loại stale, không hold/release bracket quanh 

- **opencode.73** Two-phase activation: load what is local, then install what is missing
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có resolve(install:false) → apply → nếu pending thì resolve(install:true). Cài đặt là thao tác tường minh (`omp plugin i

- **opencode.75** TUI slot tree with five placements and deterministic degradation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có cây slot, không có 5 placement (prepend/append/before/after/replace), không có 9 published path, không có chính sách 

- **opencode.77** A shipped npm package that is itself a built-in plugin
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: KHông có package first-party nào đi qua đường load/activate/transform của plugin. Chức năng first-party được hardcode bằng import 

- **opencode.78** One npm package, two isomorphic API flavours over the same 25 domains
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không dùng Effect nên không có hai biến thể API song song. Cái omp có là shim tương thích cho API thế hệ cũ (legacy-pi-*-shim.

- **opencode.80** Plugin management CLI treats Server and TUI as separate runtimes
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: CLI quản lý plugin CÓ (và đầy đủ hơn về install/feature/config), nhưng không có chiều runtime: omp chỉ có một hệ plugin duy nhất p

- **opencode.96** Effect-based HTTP client binding with runtime-safe deep imports
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥4 tên khác: Effect, effect, HttpClient, makeGlobalNode, Context.Tag, Layer.merge, app-node-platform. omp không dùng Effect

- **opencode.100** Effect-service permission ruleset engine
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử nhiều tên: permission, ruleset, allowlist, denyByDefault, action+resource, last-match-wins, findLast, Deferred. omp KHÔNG c

- **opencode.101** Reject-cascade and always-cascade
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử: cascade, rejectAll, allPending, sibling, pendingApprovals, approvalQueue, pendingRequests. KHÔNG có registry pending permi

- **opencode.102** Decline-as-defect tunnel
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử: defect, Effect.die, uncatchable, decline-as-defect. RẤT RÕ: omp biến "từ chối của con người" thành một `Error`/`ToolError`

- **opencode.103** Two-tier external-directory boundary
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử ≥8 tên: external_directory, outside workspace, isOutsideWorkspace, pathEscapes, workspaceRoot, allowedRoots, restrictTo, en

- **opencode.107** Same-origin guard on cookie auth
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử: authorizedSessionCookie, same-origin, Origin vs Host header, Set-Cookie, cookie. omp KHÔNG dùng cookie auth cho bất kỳ ser

- **opencode.108** Single-use scoped tickets for un-headerable transports
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử: ticket, single-use, oneTimeToken, pairing, invalidateWhen, consume-once, OTP. KHÔNG có cơ chế ticket ngắn hạn dùng-một-lần

- **opencode.109** Lease credential scrubbed from the tool environment
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử: delete process.env, delete Bun.env, envScrub, sanitizeEnv, redact, maskSecret, envAllow/blacklist. KHÔNG có bước xoá crede

- **opencode.115** Dual-scanner parity test suite
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp has TWO shell scanners (tokenizeShellSegments at shell-tokenize.ts:14 and extractLiteralAndChainSegments at :217, plus extract

- **opencode.118** Bounded, stack-free, cycle-safe error summarization
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Nothing in the tree flattens an error cause chain into a bounded, stack-free, cycle-safe value for storage or logs. The three piec

## Co mot phan (61)

- **opencode.1** Layered dependency spine enforced three ways (doc + manifest + import-graph) :: CÓ: (1) doc — AGENTS.md liệt kê 10 package + quy ước import catalog; (2) manifest — mọi package.json có dependency set + `./*` subpath; (3) quy ước source — subpath import thay vì barrel. THIẾU: omp k

- **opencode.4** One HttpApi compiled into two independent clients with a drift gate :: CÓ MỘT PHẦN: pattern drift-gate tồn tại nhưng chỉ cho 2 generator phía Rust (bazel lock, clippy bazelrc). THIẾU: (a) không có `check:generated` nào cho output TS sinh tự động — `models.json`, `compat/

- **opencode.5** Durable-event session: admission separated from execution :: CÓ: delivery mode steer vs followUp/queue với `followUpMode: "all" | "one-at-a-time"`; steering queue có khả năng restore khi prepare lỗi (`agent.ts:997-1023`); persistence idempotent theo structural 

- **opencode.6** Step / Physical-Attempt split with a bounded retry budget :: CÓ: budget retry có giới hạn, phân loại theo lớp lỗi, backoff luỹ thừa, và retry chạy TRONG cùng một turn (không sinh turn mới). THIẾU: không có khái niệm step-vs-physical-attempt, không có luật "retr

- **opencode.7** Instructions as content-addressed value deltas, not a registry :: CÓ PHẦN KHÁM PHÁ: AGENTS.md/CLAUDE.md/GEMINI.md qua capability provider, có priority + dedup theo scope, walk-up từ cwd. THIẾU TOÀN BỘ PHẦN CỐT LÕI (content-addressed delta): không hash nội dung, khôn

- **opencode.11** Scoped tool registry that replays transforms instead of mutating a list :: CÓ ĐÚNG VẤN ĐỀ opencode nêu và đã giải: "tool filtering là catalog visibility, không phải execution authorization" — omp tách visibility (`resolveCodeMode` `code-mode.ts:41`, xdev mounting, `requested

- **opencode.15** Repo's own config is version-controlled and self-referential :: CÓ: config của chính repo được version-control cùng code — `.omp/commands`, `.omp/skills`, `.omp/tools/tui.ts` (tool TS thật, có package.json riêng), cộng AGENTS.md ở root. THIẾU: (a) không có manifes

- **opencode.17** Drain-based re-entrant agent loop with step continuations :: CÓ: re-entry tại biên giới bước — `agentLoopContinue()` được dùng cho retry, overflow recovery, handoff continuation (`agent.continue()`), và session là bền vững (JSONL append-only + `--resume`/`--con

- **opencode.19** One provider stream + N parallel tool fibers, settled under one uninterruptible mask :: CÓ MỘT PHẦN LỚN: tool chạy song song trong một batch, có hai lớp concurrency (`shared`/`exclusive`) để tool ghi file không đụng tool đọc, `Promise.allSettled` bảo đảm không tool nào bị bỏ lửng, và có 

- **opencode.20** Documented concurrency invariant for lock-free event publication :: CÓ NỬA ĐẦU: publication thực sự lock-free — tool promise chạy song song cùng đẩy vào một mảng đồng bộ, không writer queue, không mutex; và omp CÓ kỷ luật ghi chú concurrency rất đầy đủ (pause gate, st

- **opencode.21** Ordinal-tagged batched delta streaming :: CÓ PHẦN "giảm tần suất": omp gộp frame ở TẦNG RENDER, không phải tầng publish — scheduler có cadence tối thiểu, adaptive backpressure theo chi phí frame thực đo, input grace, và defer khi output backl

- **opencode.23** Structured summary with user-boundary tail retention :: CÓ template có cấu trúc (7 mục, tương đương opencode) và CÓ quy tắc ranh giới turn để giữ tail (findCutPoint chỉ cắt tại entry hợp lệ, không cắt giữa tool_call/tool_result). THIẾU phần quan trọng nhất

- **opencode.25** Two-mode input admission: steer (mid-turn) vs queue (next turn) :: CÓ đúng hai chế độ steer (chèn giữa lượt) và followUp/queue (lượt kế tiếp), thêm cả `aside` (thứ ba, không ngắt). CÓ durable-ish delivery qua async job manager. THIẾU: (1) inbox là mảng in-memory `#st

- **opencode.26** Run coordinator with a doorbell (one fiber per busy period) :: omp có cùng mục tiêu (đóng gap lost-wakeup) bằng cơ chế khác: một in-flight counter + coalescing (`coalescedSources: Set<string>` gộp nhiều nguồn wake vào một lần chạy) + drain lại ở settle. Comment t

- **opencode.27** Classification-driven retry on an exhaustive error-tag switch :: omp CÓ phần lớn trừ "exhaustive switch": (a) classification tập trung trong `AIError` flags module với comment chính sách rõ ràng; (b) provider retryAfterMs được honor NHƯNG bị clamp — oneshot `maxDel

- **opencode.31** Per-request tool snapshot with permission filtering at capture time :: CÓ phần lớn: context.tools được gán LẠI trước mỗi model call (syncContextBeforeModelCall), và executor resolve tool từ `context.tools` chứ không từ registry sống — nên tool bị gỡ sau khi request đã đi

- **opencode.33** Stale-state settlement on drain entry :: CÓ phần tool calls: crash để lại tool_use không có tool_result được sửa ở CẢ resume path (sdk.ts:1724 và agent-session.ts:10427 gọi createInterruptedTurnAbortMessage, append synthetic aborted result) 

- **opencode.34** Sticky WebSocket session transport with affinity key and HTTP fallback :: omp CÓ sticky WebSocket + permanent HTTP fallback + connect/idle/first-event timeouts, nhưng CHỈ cho OpenAI Codex và key theo `sessionKey = credentialKey:baseUrl:model.id:sessionId` (openai-codex-resp

- **opencode.35** CodeMode — tools exposed as a JavaScript API instead of a schema list :: omp CÓ CodeMode đúng ý tưởng: thu gọn tool surface xuống keep-set, expose phần còn lại qua eval bridge dưới dạng JS API, có `codeModeDeclarations` sinh TypeScript context cho model. NHƯNG giới hạn lớn

- **opencode.38** Keymap layering with explicit input modes (base / global / modal) :: omp CÓ cơ chế overlay focus stack thực sự chặn key: overlay trên cùng chiếm focus, `preFocus` được khôi phục khi đóng, và các input listener tự gate theo `getFocused()`. Điều này đạt được mục tiêu "mo

- **opencode.42** Theme v2: semantic roles over hue ramps, with light/dark as an overlay :: omp CÓ semantic roles (66 role có tên miêu tả hành vi, không phải tên hue) và CÓ `vars` indirection để theme viết bằng tham chiếu thay literal — cùng tinh thần với opencode. NHƯNG thiếu hai trụ cột củ

- **opencode.43** Named attention events driving both OS notifications and sound :: omp CÓ taxonomy sự kiện chú ý có tên: warp-events.ts định nghĩa 4 named event (stop / stop_failure / permission_request / question_asked), và có setting per-event. NHƯNG thiếu phần cốt lõi: (1) KHÔNG 

- **opencode.44** Plugin UI slots — a fixed set of named insertion points instead of a fork :: omp CÓ extension UI API nhưng theo hướng khác: extension đăng ký RENDERER theo message type (registerMessageRenderer, registerAssistantThinkingRenderer) và shape (registerComposerShape), tức là thay t

- **opencode.45** Two-tier TUI: full screen TUI + scrollback-native "mini" interface :: CÓ: transcript sống sót qua resize và nằm trong native terminal scrollback (interactive-mode.ts:1765 `clearScrollback: options.clearInitialTerminalHistory`, :1963 `requestRender(true,{clearScrollback:

- **opencode.47** Full-screen diff viewer: file tree, hunk nav, review marking :: CÓ: hunk jump (alt+down/up, `]`/`[`), file jump (enter, `]`/`[`), split/unified toggle (`v` → cycleMode), file tree sidebar (`t`, tab đổi focus), gg/G, pageUp/Down, wrap, stage/discard. THIẾU: `mark_r

- **opencode.49** Background service lifecycle as first-class CLI surface :: CÓ: daemon broker + CLI surface + ensure có xử lý race nhiều process. THIẾU: quản lý tiến trình nền CỦA USER, không phải server dài hạng của chính agent; không có `service get/set/unset` với env-value

- **opencode.50** Self-describing config: per-field descriptions feed --help và schema :: CÓ: mỗi setting khai báo 1 lần kèm description, và `omp config list` render description đó. THIẾU: không schema nào được SINH RA từ registry (user config đọc YAML permissive, không validate theo schem

- **opencode.52** Fixture-driven TUI storybook với state-dimension keybindings :: CÓ: harness fixture-driven render component THẬT qua 4 lifecycle state, có screenshot capture, fallback generic fixture nên không crash khi thêm tool mới. THIẾU: chạy headless ra stdout, KHÔNG phải pl

- **opencode.53** Deferred-binding declaration — action đăng ký nhưng không có key :: CÓ: 5 action khai báo với description nhưng `defaultKeys: []` — đúng ý "đăng ký action, không bind key". THIẾU: không có sentinel `"none"`/`false` trong union giá trị binding người dùng nhập (chỉ `Key

- **opencode.56** Server-agnostic shell syntax highlighting :: Engine KHÁC: omp dùng Rust native addon + syntect Sublime grammars (`crates/pi-natives/src/highlight.rs:226-227` liệt kê sh/bash/zsh/shell và ps1/powershell), không phải web-tree-sitter — tích hợp chặ

- **opencode.60** Per-plugin failure isolation toàn registry :: CÓ: load-time isolation — một extension/provider hỏng không giết generation, lỗi được thu thập và hiển thị. THIẾU: đường runtime (transform throw MUỘN, sau khi đã load) không có. Không có `State.group

- **opencode.61** Duplicate plugin ID làm hạng cấp thay vì giết cả generation :: CÓ ở tầng capability (skill/model/command do provider đóng góp): trùng key → bị shadow, không crash. THIẾU ở tầng plugin/extension: không kiểm tra duplicate extension id, không có "giữ occurrence đầu 

- **opencode.62** Config-string opt-out grammar với 2 ID không thể tắt :: CÓ: cơ chế opt-out danh sách phẳng, và nó thông minh hơn bản mở đầu — `capability/index.ts:235-247` cho disabled row "không bao giờ chiếm key" để không shadow survivor đang bật (issue #11870). THIẾU: 

- **opencode.63** Pre/post activation layering để user config luôn thắng :: CÓ: user config/SDK thực sự thắng, và inline extensions (SDK) được append sau discovery. THIẾU: không có split `pre`/`post` tường minh, không có invariant "mọi built-in vào pre, mọi config adapter vào

- **opencode.64** 11 runtime hooks với typed failure channel :: CÓ: phủ gần hết vòng đời admission → assembly → dispatch → wire → response (before/after provider request thay http.request/response; user_bash/user_python thay shell.create.before; tool_approval_* th

- **opencode.65** Chỉ một hook được reject, và đó là pre-execution hook :: CÓ hành vi: `tool_call` là event chặn duy nhất và fail-safe (lỗi/timeout → block). THIẾU ràng buộc compile-time: không có mapped type kiểu `NoFailures<Spec>`; `HookHandler<E, R>` không phân biệt event

- **opencode.66** Typed RPC: plugin publish method + event cho plugin/client khác gọi :: CÓ: một bề mặt RPC typed thật (client → agent) với framing JSON-RPC. THIẾU toàn bộ phần cốt lõi của opencode: KHÔNG có `ctx.rpc.register(definition, handlers)` để plugin publish method, KHÔNG có valid

- **opencode.67** Per-plugin namespaced durable storage with hex-encoded keyspace :: CÓ: kho lưu trữ bền theo plugin, namespace bằng TÊN package (Record<pluginName, Record<key, unknown>> trong omp-plugins.lock.json + project overrides .omp/plugin-overrides.json + CLI `omp plugin confi

- **opencode.70** Plugin package layout resolved into three independent entrypoints :: CÓ: một package khai báo nhiều entrypoint độc lập qua manifest (tools/hooks/extensions[]/commands[] + per-feature); discovery chấp nhận entry thiếu qua allowlist lỗi FS (ENOENT|EACCES|EPERM|ENOTDIR) c

- **opencode.71** Trust boundary implemented as a swappable layer node :: CÓ quyết định "không load input không tin cậy" nhưng thực hiện bằng cấu hình luồn qua discovery, không phải bằng cách thay một node trong đồ thị DI: `disableExtensionDiscovery: true` dùng cho session 

- **opencode.76** TUI plugin context with per-activation disposal ownership :: CÓ (hẹp): mảng sở hữu disposer cho các registration nội bộ — #fileFallbackDisposers (write+delete fallback trampolines) và ManagedTimers clearAll() trên teardown. THIẾU (phần chính của năng lực): khôn

- **opencode.79** Plugin inventory as a first-class observable with failed slots retained :: CÓ: inventory first-class — Extension Control Center với bản ghi Extension thống nhất (kind, source provider/level, path, state active/disabled/shadowed, shadowedBy), cộng thêm ExtensionProvider để bậ

- **opencode.84** MCP resource read/list as first-class tools :: CÓ đầy đủ ở tầng protocol (list/list-templates settle song song, read, list_changed subscription). THIẾU phần "first-class tools": không có tool list_mcp_resources / read_mcp_resource trong bộ tool củ

- **opencode.88** Provider split: wire adapters vs. wiring plugins :: CÓ phần tách: wire adapter (packages/ai/src/providers/, đăng ký qua BUILTIN_API_IDS) tách khỏi catalog/wiring (packages/catalog/src/provider-models/ + discovery/ + registry/oauth/) — provider có reque

- **opencode.89** Runtime npm provider loading :: CÓ: plugin npm cài lúc chạy (PluginManager) + `pi.registerProvider` đăng ký provider không cần rebuild core. THIẾU: không có `npm.add(packageName)` cài SDK provider theo tên package lúc chạy, không có

- **opencode.90** Transport abstraction over HTTP and WebSocket for LLM calls :: CÓ: cả HTTP/SSE và WebSocket transport cho LLM, có fallback SSE↔WS và báo cáo transport đã dùng. THIẾU: không có interface `Transport<Body, Prepared, Frame>` dùng chung với `prepare`/`execute(prepared

- **opencode.91** SQLite via drizzle with 3 runtime shims + 48 migrations :: CÓ: SQLite qua `bun:sqlite` với DDL viết tay (~10 bảng cho credential/cache/usage), có schema-version table. THIẾU: không có drizzle (0 kết quả), không có shim bun/node/workerd (omp là Bun-only nên ph

- **opencode.92** Git checkpoint model via tree objects, not stash or commits :: CÓ: primitive tree object đầy đủ — readTree → applyPatch(cached) → writeTree ghi vào index tạm, không commit lên branch người dùng (dùng cho worktree/subagent isolation). THIẾU: không có API `tree.cap

- **opencode.93** Pluggable VCS adapter with a second implementation (Mercurial) :: CÓ: đúng hình dạng adapter + 2 implementation (git, jj) với `kind()` dispatch, có byte-cap cho diff (diff.rs:185-189). THIẾU: KHÔNG có Mercurial (đây là khác biệt sản phẩm thật của opencode); branch r

- **opencode.94** File-backed shell output with cursor reads and bounded in-memory tail :: CÓ: job/service nền với file log, đọc lại qua `proc://<id>`, tail có giới hạn + spill sang artifact khi vượt ngưỡng (output-meta.ts:492-540), phân trang bằng selector dòng (line-ranges.ts), và tree-si

- **opencode.95** Desktop-attached browser with a raw TCP tunnel :: CÓ: đúng ý tưởng sản phẩm — attach vào desktop browser thật qua extension, agent không nắm CDP credential, có token tuỳ chọn và loopback-only bind (README mục Limitations). THIẾU: không có bề mặt RPC 

- **opencode.97** Typed REST contract with 138 endpoints, dual Promise/Effect clients :: CÓ: có hợp đồng wire có kiểu (packages/wire dùng chung giữa server và client, type-only conformance test), có REST gateway và JSON-RPC. THIẾU: không có 138 endpoint, không có group-per-domain (`HttpAp

- **opencode.98** Integration registry with 4 credential kinds :: CÓ: có phân loại nguồn credential 5 kiểu (runtime/config/oauth/api_key/env) và kho credential SQLite cho provider. THIẾU: không có registry "integration" thống nhất, không có loại credential `command`

- **opencode.104** Deny-by-default allowlist agents :: CÓ (phần kết quả): subagent khai báo `tools: [grep, glob, read]` thì chỉ nhận đúng các tool đó, nên tool mới thêm về sau không tự động vào — đúng tính chất deny-by-default mà mục tiêu mô tả. THIẾU (ph

- **opencode.105** Persist-on-always with project scoping and a uniqueness index :: CÓ: có affordance "Always allow"/"Always reject" (chỉ trên đường ACP). THIẾU: quyết định nằm trong `Map` in-memory, bị xoá mỗi session → KHÔNG sống sót restart; khoá chỉ là tên tool (không có (project

- **opencode.106** HMAC session tokens derived from the server password :: CÓ: bearer token ngẫu nhiên 32 byte, lưu file 0600, so sánh constant-time có length-guard. THIẾU: KHÔNG có HMAC — token là hằng số tĩnh chứ không phải chữ ký stateless dẫn xuất từ password; không có `

- **opencode.110** Append-only shared log with in-place compaction :: CÓ: append-only sink với O_APPEND, xoay theo ngày + theo kích thước, retention giới hạn theo số file. THIẾU: KHÔNG compact tại chỗ — khi vượt `maxBytes` nó mở file mới (`#selectFile` + `#activeIndex`)

- **opencode.112** Symlink-resolved config discovery with global-root exclusion :: HAS: the upward ancestor walk (builtin.ts:75) and a global-root exclusion (helpers.ts:1028 `while (dir !== homeDir)`, plus :1078 `if (path.resolve(cwd) === os.homedir()) return undefined;` which exist

- **opencode.113** Enterprise policy layer that sits above plugin hooks :: HAS — the reusable half, which the opencode entry itself names as the part worth copying ("The 'policy hook only ever denies' discipline is the reusable part"): omp's user policy can only ever emit `d

- **opencode.114** Shell command decomposition into per-command permission resources :: HAS — decomposition, and better than opencode on the deny asymmetry: a `rm -rf /` buried in `cd /tmp && rm -rf /var/x` is caught, and an `allow` rule is deliberately refused on any compound line so sh

- **opencode.117** Server process fails closed without a credential :: HAS the loopback default: every always-on HTTP surface defaults to 127.0.0.1 (auth-broker types.ts:178, auth-gateway types.ts:24, parse-bind.ts:44, blob-broker service.ts:612-613 which defaults `cfgIm

