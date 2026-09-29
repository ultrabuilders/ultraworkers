# pi — omp THIEU 23 · CO MOT PHAN 48 · DA CO 39 · tong 110

## Thieu han (23)

- **pi.1** Entry-point graph cost budget
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có ĐÚNG 2 nửa của capability nhưng thiếu mảnh quyết định là gate: (1) ĐO — packages/utils/src/module-timer.ts (Bun plugin onLo

- **pi.2** Six custom dependency- and packaging-invariant gates
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp `npm run check` chỉ có 3 thứ: oxlint, oxfmt --check, tsgo typecheck. Không có một trong sáu gate nào của pi: pinned-deps, runt

- **pi.4** Lazy-loaded provider transports
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp nạp TOÀN BỘ provider vào cùng module graph tĩnh: register-builtins.ts value-import 12+ provider, stream.ts:24-39 import thêm t

- **pi.7** Pico3 session engine with scheduler, membranes, bounded context
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không tồn tại pico/pico2/pico3/pico-v5 lineage. omp có công cụ khác cùng mục đích: packages/agent/src/compaction/, append-only-con

- **pi.17** Stale-context invalidation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đây là khoảng trống thật. createContext() (runner.ts:1271) trả về object phẳng, mọi method là closure đọc `#field` của runner tại 

- **pi.24** Project-trust two-pass load
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp tường minh loại bỏ hoàn toàn: không gate, không hai lượt load, không handler trả 'yes'|'no'|'undecided'. Hai test tồn tại chỉ 

- **pi.30** Capability-lifecycle-enforced facet kernel (tier 2)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp có một capability registry (defineCapability/registerProvider/priority/dedup) nhưng đó là discovery registry phẳng, không phải

- **pi.31** Facet DAG validation + topological activation
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có DAG facet, không validate provider tồn tại cho mỗi `use`/`observe`, không activation topologically-ordered, không reload 

- **pi.32** Session/worker vs TUI/presentation facet split
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp không có khái niệm plugin facet kép. Extension chạy trong một tiến trình và nhận `ExtensionContext` đầy đủ (SDK, model registr

- **pi.33** Server-owned, serialized plugin builds
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có build queue serialize theo generation, không hash output theo package path, không build presentation artifact server-side

- **pi.34** Tier-1 ↔ tier-2 capability bridge
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có tier 2 để bridge. Điểm cần lưu ý: hướng của omp ngược với pi — thay vì thu hẹp plugin API xuống vài service, omp cung cấp

- **pi.35** Project trust — directory-scoped resource gate
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Không có trust.json, không tri-state per-directory, không danh sách cổng đóng gồm settings.json/extensions/skills/prompts/themes/S

- **pi.36** Trust enforcement at the consumer (defence in depth)
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Nguyên lý "re-check ở consumer, throw khi deny" không tồn tại vì không có quyết định trust nào để re-check. Đã thử: setProjectTrus

- **pi.46** Sandbox env restoration for compiled Bun binaries
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Closest: packages/utils/src/env.ts:112-130 `readLaunchEnv()` reads /proc/self/environ on Linux — but only to snapshot the pre-dote

- **pi.47** LLM-generated bug summary from the transcript
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Closest neighbours checked and rejected: `omp grievances` (packages/coding-agent/src/commands/grievances.ts) manages tool-issue ro

- **pi.52** Pluggable Operations backends behind identical tool definitions
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp declares the pi Operations *types* only so legacy pi extensions fail loudly rather than silently writing to the local disk. Th

- **pi.55** Child-process exit that survives detached descendants
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp delegates execution to a Rust `Shell.run` (brush-core via @oh-my-pi/pi-natives) that returns one awaited result. Whether the t

- **pi.66** Tool loadout deltas declared to the model via system messages
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: omp solves a related problem by a different route: `SentToolDefinitions` (packages/agent/src/sent-tool-definitions.ts:1-40) record

- **pi.74** Outcome-durability vs. source-order separation for parallel tools
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Da thu 6 ten khac nhau (outcome_ready, pendingEntry, branchTip, sourceIndex, placement, materializ/SessionInvariantError) — tat ca

- **pi.81** Effect gate: procedure-facing admission vs. owner-facing lifecycle
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: 3 hang ton tai nhung deu SAI nghĩa: (1) packages/agent/src/pause.ts:24 AgentPauseGate la gate PAUSE toan process (poll o 2 action 

- **pi.87** Two-renderer TUI with hot-swap between scrollback and fixed-dock viewport
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Da thu 10+ ten. Alt-screen chi dung cho (a) repaint tam thoi khi resize (tui.ts:1486-1560) va (b) app fullscreen dung lap nhu git-

- **pi.91** Alt-screen search with match navigation and jump-to-latest
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 nhóm tên khác nhau (AltScreenSearch/SearchIndex/findMatches; incremental search/transcript search; searchMatchStyle/scrol

- **pi.103** Project trust model gating project-local config, extensions, and skills
  - what: 
  - noi dat trong repo tham chieu: 
  - idea only: 
  - note: Đã thử 3 nhóm tên: projectTrust/ProjectTrust/resolveProjectTrusted/defaultProjectTrust; TrustDecision/ask-trust-ignore; find -inam

## Co mot phan (48)

- **pi.3** Strict layered workspace DAG with zero-internal-dep leaves :: CÓ: layering thật trong source — leaf tĩnh (wire, omptype, natives, utils) → tui/ai/catalog → agent → coding-agent; exports map khai báo rõ; tất cả workspace cross-ref dùng specifier @oh-my-pi/*. THIẾ

- **pi.6** Session harness with reducer/checkpoint/recovery runtime :: CÓ (recovery/retry/restore): turn-recovery.ts 126KB, retry-fallback-chains.ts, unexpected-stop-classifier.ts, session-persistence.ts, session-loader.ts, agent-storage.ts. THIẾU (kiến trúc): không có `

- **pi.9** Example extensions as an executable capability catalog :: CÓ khái niệm: examples/ là catalog thực thi được, có cả extension + hook + custom-tool + SDK recipe, và with-deps/ có package.json thật. THIẾU về quy mô: pi có 73 extension example + 9 example subproj

- **pi.10** Pluggable session storage behind a sub-monorepo seam :: CÓ (pluggability thật, thậm chí nhiều hơn pi): interface SessionStorage + 5 implementation (File, Memory, Indexed, Redis, SQL), có cả writer/lock/conflict-error abstraction. THIẾU 2 phần cố lõi của pi

- **pi.11** .pi/ agent-self-configuration directory :: CÓ: convention `.omp/` ở repo root, được agent đọc thật (builtin.ts:287 skills, :396 RULES.md, :949 AGENTS.md, helpers.ts:1016 plugins), có commands + skills + tools commit sẵn, và có scratch-dir giti

- **pi.14** Client / protocol / server split for out-of-process driving :: CÓ chức năng, THIẾU hình dạng: out-of-process driving chạy thật qua 3 kênh (RPC mode, ACP mode, collab relay + Python client). NHƯNG không có package protocol/client/server tách riêng như pi: không có

- **pi.16** Extension lifecycle (tier 1) — factory, invalidate, no deactivate :: CÓ 2/3: (1) factory type giống hệt pi; (2) đúng triết lý "no deactivate" — teardown là việc của author qua `session_shutdown`, và omp còn làm tốt hơn ở chỗ có ManagedTimers + `disposeFileFallbacks()` 

- **pi.21** jiti loader with no build step + virtual module map :: CÓ 1 nửa: virtual/alias module map để extension import được `pi-tui`, `pi-agent-core`, `pi-ai/compat`, typebox, và cả package host mà không cần cài — đúng mục đích pi nêu (quan trọng trong compiled bi

- **pi.23** Unified resource manifest (extensions/skills/prompts/themes) :: CÓ: một key `omp`/`pi` duy nhất trong package.json (PluginManifest) + sub-discovery theo thư mục anh em (skills/, prompts/, rules/, commands/, tools/, hooks/, .mcp.json) nên một package = một đơn vị. 

- **pi.25** Package distribution (npm/git/URL/local) :: CÓ đủ 4 kênh (npm / git có ref / URL / local) + cờ `pinned` (git-url.ts:16,184) + identity theo repo-URL-không-ref (manager.ts:570-574 findGitPackageName). THIẾU: không có lệnh kiểu `pi update --exten

- **pi.38** Config value resolution: !command / $ENV / literal :: CÓ: `!command`, env-var chính xác, literal, timeout 10s, memoize. THIẾU: KHÔNG có template expansion — không hỗ trợ `$VAR`/`${VAR}` nhúng trong chuỗi, không có escape `$$` và `$!`, không có `ENV_VAR_N

- **pi.39** Credential redaction for diagnostics :: CÓ: key-name redaction cho env, value-shape redaction cho token (dùng cho traffic ra provider, không phải bundle chẩn đoán). THIẾU 3 phần quan trọng: (1) không có redactUrl() gỡ userinfo + redact quer

- **pi.40** At-rest credential hardening + cross-process locking :: CÓ phần file-mode: dir 0o700 + file 0o600 cho credential DB và các token file. CÓ sẵn helper lock cross-process có retry/delay (thậm chí mạnh hơn proper-lockfile: OS-native, tự nhả khi process chết). 

- **pi.41** TOCTOU-safe unix socket publisher :: CÓ: dọn socket cũ có kiểm tra sống/chết, chmod 0o600 sau publish, thư mục private 0700 + kiểm tra owner, xử lý sun_path overflow. THIẾU phần lõi chống TOCTOU: bind vào `ownedBindPath` rồi `lstat` + `i

- **pi.43** Crash ring buffer with one-shot notification :: CÓ: ghi marker `session_exit` với `kind:"fatal"` + danh sách tool call dở dang, và cảnh báo resume ở lần mở sau. THIẾU: không có ring buffer có giới hạn (MAX_CRASH_RECORDS=5 / MAX_AGE=7 ngày), không c

- **pi.44** Durable transaction layer with read-before-write enforcement :: CÓ: ghi atomic + lock chống race append-vs-rename (một loại transaction thực dụng ở tầng session file), WAL, và db.transaction cho các store sqlite. THIẾU: không có lớp Transaction trên storage plugga

- **pi.45** Append-only JSONL session persistence with exclusive create :: CO: append-only JSONL + parentId fork chain — yes, and omp is more hardened (in-body sync, partial-write rollback via ftruncate, publish lock, O_CLOEXEC fd reuse). MISSING: the exclusive-create half. 

- **pi.48** Non-UI modes and CLI trust override :: CO: scriptable non-UI mode (`--no-ui`, fail-closed for extension dialogs) and a CLI trust override for extension loading (`--trusted-extension`). MISSING: there is no project-trust concept at all. typ

- **pi.51** Typed tool-registration contract with provider-side constrained sampling :: CO: the ToolDefinition interface third parties implement, the TypeBox `parameters` schema, the provider-side strict-JSON-schema machinery (normalize/adapt/compatibility + per-provider `strict: true` e

- **pi.53** Lazy per-provider API module loading :: CO: the lazy-module-loading technique exists and is used for the heavy OAuth flow modules (registry/hooks/*), which is the same startup-cost motivation. MISSING: the wire-protocol half. `lazyApi`/`Laz

- **pi.56** Patched global fetch with proxy + timeout policy :: CO: the process-wide fetch patch and the proxy policy — omp installs its own `globalThis.fetch` wrapper, honours PI_PROXY/HTTPS_PROXY/ALL_PROXY/NO_PROXY, and hard-bypasses loopback/RFC1918/link-local/

- **pi.57** Unix-socket RPC with versioned, schema-validated envelopes :: CO: multi-client driving of one agent, a versioned handshake (ready frame advertising protocol versions; RpcProtocolVersion 1|2), frame size caps with a FrameError-style failure, and a session/attachm

- **pi.59** Storage backends split node / browser / memory :: CO: the runtime does pick among multiple storage backends behind one `SessionStorage` interface, and the node/memory split exists (FileSessionStorage vs MemorySessionStorage, both implementing the sam

- **pi.60** Documented trust model for plugins and project resources :: CO: the honest "we do not sandbox" statement, in three separate places, plus docs/approval-mode.md:72 spelling out that bash pattern policy "is not process or filesystem containment". MISSING: there i

- **pi.62** Two-level agent loop with pluggable turn-lifecycle hooks :: CO: the two-level structure (runLoop wrapper over runLoopBody's inner tool-drain loop) and three of the six extension points, with real config-callback semantics. MISSING: `finishTurn` returning `{act

- **pi.69** Provider context-overflow detection matrix :: THIẾU: (1) `isRecoverableLength(message, desiredMaxOutput)` không tồn tại — logic length-recoverable nằm rải ở packages/coding-agent/src/session/session-maintenance.ts:3027-3140, khoá theo `stopReason

- **pi.71** Bounded compact-and-retry on overflow (exactly one attempt) :: THIEU phan goc cua pi: khong co co-lap `_overflowRecoveryAttempted` chan overflow retry DUNG MOT LAN. Chi co `#incompleteRecoveryAttempts` (session-maintenance.ts:550) bounded boi INCOMPLETE_RECOVERY_

- **pi.72** In-process owned subagent conversations (pico3) :: CO: subagent in-process (khong subprocess), co che do background detached, co isolation. THIEU: API `api.conversation(spec, ctx)` tra ve conversation handle rewindable, `OwnedConversationSpec.inherit?

- **pi.73** Explicit busy-input policy for sends :: Y nghia dung (caller noi ro y minh), nhung hinh dang khac: khong co mot truong discr `SendInput.whenBusy: "steer"|"followUp"|"reject"` — ba y minh la BA method tach rieng. Runtime co them `steeringMod

- **pi.75** Projection-time per-entry context editing :: CO nua gia re: bo tool-output lon khoi context ma khong goi LLM (prune/shake), va context_notes tool ghi chu vao context. THIEU nua pi: khong co entry type `context_edit`, khong co `replacement: null`

- **pi.77** Storage-agnostic session interface with a shared conformance suite :: CO interface + 5 backend (File/Memory/Indexed/SQL/Redis). THIEU conformance suite — day chinh la phan pi noi "lam cho storage-agnostic tro thanh THAT chu khong phai aspirational". Also thieu 5-method 

- **pi.79** Stream-function injection instead of a baked-in provider :: CO: StreamFn la contract type, truyen per-call. THIEU: module-level default holder ma pi dung de host cai dat 1 lan; va QUAN TRONG hon — agent runtime KHONG provider-free nhu pi, no import truc tiep c

- **pi.80** Per-tool replay policy for unknown-outcome effects :: CO mot recovery layer quyet dinh replay an toan, va cham hon pi: #unexecutedToolCallsReplaySafe chi cho phep replay khi moi tool call co synthetic `executed: false` + turn khong co image/server-tool/t

- **pi.83** Field-by-field usage accumulation :: CO: cong field-by-field dung 5 truong cost + token. THIEU: nua quan trong nhat — merge co giu khuong `cacheWrite1h`/`reasoning` chi khi it nhat mot ben co (`...(a===undefined && b===undefined ? {} : {

- **pi.88** Extension-controllable footer, header, widgets, working indicator, window title :: CO 5/6: footer, header, widget tren/duoi editor, status line, window title — tat ca reversible bang undefined. THIEU: `setWorkingIndicator({frames})` — extension CHI doi doi text (`setWorkingMessage(m

- **pi.89** Typed overlay system with focus restore and anchor-based positioning :: CÓ: showOverlay với 9 anchor, offset, margin, responsive visible(), OverlayHandle có setHidden(), overlayStack có preFocus + hidden. THIẾU: phần lõi được pi đánh giá cao nhất — focus-restore state mac

- **pi.92** Session tree navigator with fold/unfold, labels, and horizontally-panning viewport :: CÓ: tree panel với connector + ancestor gutter, label per-node (edit được), 5 filter + cycle 2 chiều, fold/unfold, gutter nén bằng '…'. THIẾU 2: (1) toggleLabelTimestamp — không có; (2) viewport heuri

- **pi.93** Session selector with path/sort toggles, inline rename, and two-stage delete :: CÓ: danh sách session tìm kiếm được với fuzzy ranking 2-pass (exact→partial→fuzzy, :192), scope folder/all qua Tab (:877), delete disambiguation (Delete hoặc Backspace khi query rỗng — đúng ý 'không p

- **pi.96** Status indicator family with countdown retry and cancel hints :: CÓ (tương đương chức năng): CountdownTimer tái sử dụng, retry countdown sống, cancel hint rebind-aware, compaction message phân nhánh theo reason (overflow có message riêng), idle row cố định 2 dòng đ

- **pi.97** Private bug-report and session-share flows with explicit consent and offline fallback :: CÓ: /share với encryption-at-rest, redact trước khi upload, fallback sang private GitHub gist (options.store==="gist"). THIẾU TOÀN BỘ nhánh /bug: consent step, disclaimer liệt kê đích xác nội dung gửi

- **pi.99** Extension command/shortcut/tool/flag/renderer registration with conflict diagnostics :: CÓ: register command/shortcut/tool/flag/message-renderer + conflict diagnostics có báo (không silent drop). THIẾU 2: (1) registerEntryRenderer và registerMarkdownTransformer — không tồn tại; (2) exten

- **pi.100** Self-installing package manager for extensions/skills/prompts/themes :: CÓ: installer đa nguồn (npm/GitHub/git/ssh/local/marketplace) + per-plugin feature filtering + plugin settings schema. THIẾU: lệnh update package; manifest không khai báo skills/prompts/themes; không 

- **pi.102** Offline HTML/JSONL session export with an interactive viewer :: CÓ: HTML export tự chứa (vendor marked + highlight.js → không cần mạng), sidebar navigation, tool renderers riêng, chạy được từ slash lẫn CLI. THIẾU: (1) không có biến thể export JSONL (session vốn đã

- **pi.105** /hotkeys and /changelog as in-transcript overlays, extension-aware :: CÓ: /hotkeys + /changelog, chèn vào transcript bằng DynamicBorder + Markdown (giữ được copy/scroll), bảng phản ánh binding thật của user, có mode 'full'. THIẾU: section thứ 4 "Extensions" dựng từ exte

- **pi.106** Bash mode with in/out distinction and non-TTY-safe output guarding :: CÓ (và mở rộng): !/!! tách context, border đổi màu báo trước khi Enter, chặn bash thứ hai kèm hint theo rebind, thêm cặp $/$$ cho Python. THIẾU: output-guard (takeOverStdout/restoreStdout) chặn subpro

- **pi.107** Reloadable resource layer: extensions, skills, prompt templates, themes, keybindings, context files :: CÓ: loader cho extension, skills/prompts/themes qua resources_discover, keybindings.reload(), /reload (dù chỉ MCP). THIẾU: KHÔNG có đường nối thực sự — reason:"reload" không emit, /reload không reload

- **pi.108** Executable documentation: 130 example extensions + 42 doc pages + skills :: CÓ: docs đầy đủ hơn pi về số trang (87 vs 42), có extensions.md 52KB. THIẾU: docs KHÔNG chứa example thật — không có doom-overlay, không có overlay-qa-tests.ts, không có quy ước docs trỏ thẳng vào ../

- **pi.110** Self-update with install-method detection and a changelog-gated experience :: CÓ: updater thật (binary asset + digest verify + kênh canary/stable), update plugin, /changelog đầy đủ. THIẾU: KHÔNG có detectInstallMethod()/makeSelfUpdateCommand() — omp phân nhánh theo DỮ LIỆU RELE

