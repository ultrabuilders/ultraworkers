# dsh — chunk 3/5 (22 năng lực)

## dsh.45 Three browser backends, two of which are MCP servers wrapped as providers

- **where:** packages/experimental/{browser-use-playwright-mcp, browser-use-chrome-devtools-mcp, browser-use-stagehand-native, browser-use-runtime}/
- **what:** Four providers under `packages/experimental/`: Playwright (`@playwright/mcp@0.0.80`), chrome-devtools-mcp (`1.9.0`), Stagehand native (`@puppeteer/browsers@3.2.2`), and `browser-use-runtime` which has its own `src/mcp.ts` — it presents an MCP server as a browser-use provider. The Stagehand provider contributes 6 model-facing tools (`stagehand_act`, `_extract`, `_navigate`, `_observe`, `_screenshot`, `_tabs`).
- **how:** Each registers into the single slot above. `browser-use-runtime` reuses the MCP client stack rather than reimplementing browser driving.
- **solves:** One tool surface over three very different browser automation stacks, and reuses the MCP bridge instead of a third protocol implementation.
- **port effort:** N/A — the right lesson is 'wrap external browser MCP servers through the existing MCP bridge rather than writing a new adapter'. | **idea only:** True
## dsh.46 Seam-and-provider pattern for shell, subprocess, fs, sandbox, terminal, storage, web

- **where:** packages/shell/*, packages/subprocess/*, packages/terminal/*, packages/storage/*, packages/web/*, packages/ssh/*, packages/fs/*
- **what:** Each external capability is an abstract Service plus N interchangeable providers, selected by config. shell: seam + bash-local/bash-sandbox/pwsh-local/pwsh-sandbox. subprocess: seam (managed process groups) + subprocess-local + subprocess-ssh. terminal: seam (owner-scoped PTY ids, backend registry) + terminal-bash. storage: hub + json + sqlite backends + a schema-validated `storage-domain` form. web: ctx.web seam + 3 search providers + 1 fetch provider. fs and sandbox each have local + ssh providers.
- **how:** Local vs remote is a provider swap, not a code path. `dsh-tool-bash` is 'a model-facing bash tool with optional generic background-job and sandbox-escalation support' — the escalation is what lets an untrusted session earn a wider sandbox without restart.
- **solves:** Makes 'run this on an SSH host instead' a configuration change, and keeps the model-facing tool definition identical across every backend.
- **port effort:** The pattern is architectural, not code — omp already has a similar shape. The specific gap dsh covers that omp may not: terminal (owner-scoped persistent PTY with 6 tools) and the sandbox-escalation path. | **idea only:** True
## dsh.47 Seam-and-provider pattern for subagents, with 6 backends including Codex and Claude Code

- **where:** packages/subagent/{subagent,subagent-spawn-in-process,subagent-fork-in-process,subagent-acp,subagent-dsh-sdk,subagent-codex,subagent-claude-code,subagent-in-process-driver,tool-subagent,tool-subagent-control}/
- **what:** `ctx.subagents` is a named-provider registry for delegating to child agents. Six backends: spawn-in-process (fresh child), fork-in-process (child seeded with a PREFIX OF THE PARENT'S LOG — provider/model stay equal to the parent so inherited history remains KV-cache eligible), subagent-acp (out-of-process over ACP), subagent-dsh-sdk (child harness subprocess over stdio JSON-RPC), subagent-codex (one-shot, official app-server protocol), subagent-claude-code (one-shot, official Agent SDK). `tool-subagent-control` adds globally named `send_message`, `interrupt_agent`, `list_agents` over continuations.
- **how:** Each delegation tool names a `provider` + `toolName` + `backgroundMode` (one-shot vs continuable). The two external CLI agents are mounted `disabled: true` in the standard preset with `maxDepth: provider-managed`. The fork backend deliberately OMITS model selection so KV cache is reused.
- **solves:** Delegation is provider-agnostic: the same tool can spawn an in-process child, fork a KV-warm copy, or shell out to Codex or Claude Code.
- **port effort:** High. Directly answers the 'codex' part of the request: dsh has a first-class Codex app-server subagent backend, disabled by default. | **idea only:** True
## dsh.48 Snapshot-per-operation config model for the LLM adapter

- **where:** packages/llm/llm-pi-ai/src/{index,adapter,config}.ts; the README's 'Understand the implementation' section
- **what:** Each LLM operation captures the whole `providers` Config reference plus a `createModels()` collection holding every built `Provider` before its first `await`. A config change builds a NEW collection rather than mutating the one in use, so a request that began under one configuration can never finish under another. Route-set or retry-policy changes re-register the same adapter instance in place, preserving previous routes when another adapter already owns a requested one.
- **how:** The credential store and auth context are deliberately stable ACROSS snapshots, so a config change rebuilds the collection without forgetting who is signed in. The adapter's own `apiKey` option is pi-ai's highest-priority auth override — that is what makes a fail-loud `apiKeyEnv` reference possible.
- **solves:** Removes an entire class of torn-config bug that is otherwise very hard to reproduce, and keeps auth state independent of the config snapshot lifecycle.
- **port effort:** Medium; the concept transfers to any adapter whose configuration can change at runtime. | **idea only:** True
## dsh.49 Model discovery over the wire, per protocol, with tolerant parsing

- **where:** packages/llm/llm-pi-ai/src/discovery.ts (363 lines)
- **what:** The adapter answers 'which models can this provider serve?' for settings surfaces. A route pi-ai SHIPS is answered from its catalog with no network call (preserving its `input` array as discovery `inputModalities`); only an unknown route is interrogated. `openai-completions`/`openai-responses` use `GET {baseURL}/models` with bearer auth; `anthropic-messages` uses native `GET /v1/models?limit=1000` with `x-api-key` + `anthropic-version`. The parser accepts a standard `data` array OR an enriched `models` map, and handles `max_input_tokens`/`max_tokens`, a map key that stays the request id even when the entry names a different canonical id, primitive-valued map properties, and a missing display name (falls back to the request id).
- **how:** The Anthropic listing URL accepts the API root with or without a trailing `/v1` because gateway docs publish both spellings, and ONLY that listing URL normalizes the segment — model requests receive `baseURL` unchanged. The reply is candidate metadata a surface may offer for adoption; nothing is stored.
- **solves:** 'Add a provider' becomes a form that asks the endpoint what it serves instead of a hand-written model list that goes stale.
- **port effort:** Medium. omp's `packages/catalog/scripts/generate-models.ts` already does upstream-driven generation; the delta is the per-PROTOCOL live discovery at settings time. | **idea only:** True
## dsh.50 Config layers as ordered patch rows, not a merge tree

- **where:** packages/bundle/*/cordis.patch.yml (base, web-app, headless, sdk-app, sdk-minimal, acp-app) + packages/bundle/web-app/presets/{minimal,standard,ptc}.patch.yml
- **what:** The base profile is ONE `insert` over an empty root. Later bundle patches and the user's profile `cordis.patch.yml` address rows BY ID, last write wins per row. A patch REPLACES the row's whole `config` rather than merging into it, so a row whose value differs by mode lives in that mode's bundle instead of base.
- **how:** Rows support `disabled: !!js <expr>` (vendor patch entry 18: the ONLY interpolated metadata field, evaluated at every mount decision, keeping the `!!js` form on write-back). Agent presets are themselves rows (`dsh-agent-preset`) with `cordis:group` blocks carrying `isolate:` keys (planMode, compaction, toolResultPruner, workflowEngine, terminals) so a preset can scope a capability to a mode.
- **solves:** Makes 'user overrides one setting' a one-row patch, and makes the default composition fully readable as a single ordered list.
- **port effort:** Medium; the `isolate:` key concept (scoping a capability to a mode without a new plugin) is the notable piece. | **idea only:** True
## dsh.51 Per-tool 'Model Experience' documentation contract

- **where:** packages/mcp/mcp-client/README.md, packages/mcp/mcp-resources/README.md, packages/core/tools/README.md; the pattern is repo-wide across package READMEs
- **what:** Every package README carries a `## Model Experience` section that, for each model-visible surface, states three things in fixed form: **What the model sees**, **Token effect**, and **KV Cache effect**. The MCP resource README, for instance, says the 3 shared definitions contribute fixed schema cost, that adding the FIRST visible server or removing the LAST changes the next tool-schema prefix, and that a reconnect recovering an UNCHANGED tool list reproduces identical definitions and stays prefix-stable.
- **how:** Every package README also carries a `## Known Limitations and Deferred Work` section with an explicit disclaimer that these are shipped constraints, not a backlog, plus a `## Dev Note` for open, explicitly non-authoritative directions.
- **solves:** Forces KV-cache stability to be a stated design constraint of every tool addition, not an afterthought — and makes cache regressions reviewable at the PR level.
- **port effort:** Very low as a documentation template; high value, and it is the single most transferable non-code practice in the repo. | **idea only:** True
## dsh.52 Plugin entrypoint: ba hình dạng, một hợp đồng

- **where:** vendor/cordis/src/registry.ts:8-146 (type + resolve + runtime), :316-336 (plugin())
- **what:** Một plugin là function (ctx, config), class new (ctx, config), hoặc object {apply(ctx, config)}. Mọi hình dạng đều mang metadata tùy chọn: name, Config (StandardSchemaV1 validator), inject (dịch vụ bắt buộc), provide (tên dịch vụ cung cấp), intercept. RegistryService.resolve() chuẩn hoá cả ba về một callback là khoá danh tính; Plugin.Runtime được cache theo callback nên nhiều ctx.plugin() trên cùng một callback dùng chung runtime.
- **how:** Đọc trực tiếp; ví dụ thật trong docs/cookbook/extension-cookbook.md (export const name = 'permission-gate'; export const inject = ['agents']; export function apply(ctx) {…})
- **solves:** Cho phép một package viết bất kỳ tích hợp nào cũng có cùng một entrypoint, và cho phép registry gom nhiều lần mount của cùng một plugin vào một runtime dùng chung.
- **port effort:** Thấp nếu đã có DI container; cao nếu chưa — đây là lớp nền, mọi thứ khác đứng trên nó. | **idea only:** True
## dsh.53 Fiber: máy trạng thái 6 trạng thái + epoch

- **where:** vendor/cordis/src/fiber.ts:147-154 (enum), :356-400 (_execute), :415-561 (effect), :611-639 (_refresh/_setEpoch)
- **what:** FiberState = PENDING | LOADING | ACTIVE | FAILED | DISPOSED | UNLOADING. Chuyển trạng thái đi qua _setEpoch(epoch): INACTIVE→active là _reload(), ngược lại là _unload(). Epoch là chuỗi ':'.join(inject-uid) nên tự động reload khi một dependency bị thay thế. Fiber.effect chịu 5 hình dạng trả về (disposer / promise / iterable / asyncIterable / nullish) và gom disposer theo thứ tự đảo khi dispose.
- **how:** Đọc; FiberState được re-export qua vendor/cordis/src/index.ts:6
- **solves:** Biến 'load order' thành hệ quả của yêu cầu dịch vụ, và làm cho unload/restart là một phép toán xác định thay vì một quy trình thủ công.
- **port effort:** Trung bình — logic thuần, không I/O, port trực tiếp được nếu ngôn ngữ đích có async iterable. | **idea only:** True
## dsh.54 Mọi đăng ký là effect có disposer — HMR và teardown miễn phí

- **where:** vendor/cordis/src/fiber.ts:110-117 (effectInertia), :415-561, :565-572 (getEffects)
- **what:** ctx.effect(execute, label) chạy ngay, thu disposer, dispose theo thứ tự đảo. Wrapper được ĐẨY VÀO OWNER LIST TRƯỚC KHI BODY CHẠY để unload khởi động từ trong setup vẫn chờ setup + cleanup. Async cleanup ẩn trong effectInertia WeakMap để owner khác JOIN cleanup đang chạy thay vì chạy lần hai. EffectMeta dựng cây nhãn phục vụ chẩn đoán.
- **how:** Đọc; ledger mục #6 trong vendor/README.md mô tả chính xác ba lỗ hổng reentrant này
- **solves:** Loại bỏ hoàn toàn khái niệm 'dọn dẹp thủ công': hot-reload trở thành hệ quả, không phải tính năng phải xây.
- **port effort:** Thấp — đây là ý tưởng, không phải code. | **idea only:** True
## dsh.55 Loader: cây entry có địa chỉ id, vá theo id, ghi lại xuống đĩa

- **where:** vendor/loader/src/config/{tree,group,entry,isolate}.ts, vendor/loader/src/index.ts:171-173 (root write no-op)
- **what:** EntryTree → EntryGroup → Entry → Fiber. EntryOptions = {id, name, config, group, disabled, inject}. EntryTree.write() là abstract; Loader root override thành no-op (in-memory), còn Include và preset thay bằng persist thật. Entry.getOuterStack() dựng call stack ảo theo baseUrl#entryId để lỗi plugin trỏ về đúng dòng YAML.
- **how:** Đọc entry.ts; chạy thực tế qua `dsh --dump-config` (xem ledger mục #11)
- **solves:** Biến 'cấu hình' thành dữ liệu có địa chỉ ổn định, nên vá, disable, và hot-reload đều là thao tác trên một hàng có id chứ không phải sửa một danh sách plugin.
- **port effort:** Trung bình — cần một định dạng cây entry + cơ chế vá + một lớp persist. | **idea only:** True
## dsh.56 Ngôn ngữ YAML !!js — cấu hình là biểu thức sống

- **where:** vendor/include/src/index.ts:9-22 (js-yaml Type + entryListSchema), vendor/loader/src/config/entry.ts:85-97 (disabledOf/evaluate), vendor/loader/src/index.ts:104-113 (internal/config interpolate + marker EntryGroup.key)
- **what:** `!!js "<expr>"` biến một scalar thành node biểu thức. Interpolate CHỈ trên hai trường: config (sau khi inject đã active, resolve trong chính context của plugin) và disabled (ở MỖI lần quyết định mount, resolve trong context của loader). Node thô giữ nguyên khi ghi lại nên vẫn hiện !!js. Metadata còn lại giữ literal. Đây là cơ chế duy nhất cho conditional composition.
- **how:** Đọc; ví dụ thật: packages/bundle/base/cordis.patch.yml `plugin-manager: disabled: !!js "!ctx.get('profileContext')"` (8 dòng dùng !!js disabled trong base)
- **solves:** Cho phép cùng một cây cấu hình phục vụ nhiều profile/mode mà không cần fork file — và cho phép `dsh --dump-config` in ra đúng thứ mà include sẽ mount, vì nó dùng CHUNG applyEntryPatches (ledger #11).
- **port effort:** Thấp-Trung bình — cần một YAML type tag + một evaluator; cần cẩn thận về thứ tự resolve. | **idea only:** True
## dsh.57 33 seam: interface + registry provider có tên + disposer + mã lỗi chọn provider

- **where:** packages/web/web/src/index.ts:98-191, packages/lsp/lsp/src/index.ts:90-137; phân loại tại docs/capability-seams.md
- **what:** Định nghĩa chuẩn: service khai register*(provider) => () => void, từ chối trùng id với mã lỗi riêng, và lộ VÀI LỖI CHỌN PROVIDER CÓ MÃ thay vì im lặng fallback — ví dụ WEB_PROVIDER_CONFIGURED_MISSING / _UNAVAILABLE / _AMBIGUOUS, LSP_CONFLICT, LSP_INVALID_PROVIDER. Danh sách seam: shell, fs, sandbox, subprocess, terminals, storage, session-query, web, subagents, lsp, skills, compaction, jobs, spill, webServer, directoryPicker, workflow, speechToText, browserUse, computerUse, credentials, deepseekAccount, authorization, sessionTelemetry, sessionTitle, fileReferences, mcpResources, userQuestions, ptcRuntime, spillStore, sessionReferenceResolver.
- **how:** Đọc 2 seam đại diện + cột 'Writes / affects' trong bảng capability-seams
- **solves:** Tách 'cái gì' khỏi 'cài đặt cụ thể': bash-sandbox thay bash-local mà không sửa tool-bash; fs-ssh thay fs-local mà không sửa tool-fs. Đây là thứ biến 'mọi thứ là plugin' từ khẩu hiệu thành cấu trúc.
- **port effort:** Trung bình — ý tưởng rẻ, nhưng phải cả quy ước đặt tên lỗi và quy tắc provider-mặc-định. | **idea only:** True
## dsh.58 Bốn bảng 'tại sao' đều SINH TỰ ĐỘNG và có freshness gate

- **where:** scripts/gen-doc-graphs.ts, scripts/gen-cordis-catalog.ts (64KB), scripts/gen-tool-catalog.ts, scripts/gen-cordis-api.ts, packages/typert/generator/src/cordis-catalog.ts; 63 script verify-*
- **what:** Đây là câu trả lời trực tiếp cho câu hỏi 'đây là API công khai hay chỉ là nơi gọi nội bộ': NÓ CÔNG KHAI, VÀ MÁY CHỨNG MINH. (a) docs/capability-seams.md — 90 dịch vụ phân loại core/seam/service/bundle, với implementor và consumer, do gen-doc-graphs.ts sinh kèm completeness guard. (b) docs/subsystems/*.md — 55 trang có block BEGIN GENERATED cordis-surface với JSDoc gốc, kiểm bằng verify-cordis-catalog. (c) tool-catalog.md — 30 gói tool / 95 tên tool, BOOT THẬT rồi đọc ctx.tools.schemas() vì schema tool không suy ra được tĩnh. (d) api-catalog.ts — cùng AST walk. 11 catalog khác cũng có gate riêng.
- **how:** Đọc header của từng file sinh; `pnpm run doc-sync` = `tsx scripts/run-gates.ts doc-sync`
- **solves:** Ngăn tài liệu lệch với code mà không cần kỷ luật thủ công — đây là thứ biến 'luận điểm' thành thứ kiểm chứng được.
- **port effort:** Cao về công cụ (cần AST walk + renderer + gate CI), nhưng ý tưởng ('sinh tài liệu từ một nguồn duy nhất, gate freshness') thì rẻ và nên chép ngay. | **idea only:** True
## dsh.59 Harness tự mô tả chính nó cho model lúc chạy

- **where:** packages/extensions/tool-cordis/src/{providers,api-catalog,config,present,host}.ts; 2 provider đăng ký tại providers.ts:38-60
- **what:** cordis_inspect_list / cordis_inspect_query phục vụ SERVICE_API (89) + EVENT_API (81) + TYPE_API (926) + INHERITED_CTX_API (9 nhóm). Hai tầng: gọi không có tham số → directory gọn; gọi có tên → MỘT hợp đồng đầy đủ kèm referencedTypeClosure() chỉ trả về đúng các type mà chữ ký tham chiếu. Có thêm provider Config đọc schema Config sống từ cây Loader đang chạy, phân loại trạng thái schema|absent|unsupported|tree|inactive.
- **how:** Đọc queryServiceApi/queryEventApi ở cuối api-catalog.ts và hostInspectProviders
- **solves:** Model viết plugin mà không cần snippet cứng trong prompt, và không bị mơ hồ khi API đổi.
- **port effort:** Trung bình-Cao — cần bộ sinh catalog trước, rồi phần serve là mảnh nhỏ. | **idea only:** True
## dsh.60 89 UI slot có hợp đồng sinh tự động (cardinality, scope, occupants, replaceRisk)

- **where:** packages/extensions/cordis-client-runner/src/client/slot-catalog.ts (4132 dòng, 89 slot), sinh bởi scripts/gen-client-catalog.ts
- **what:** Mỗi slot mang kind (single/list/keyed/chain), scope (root/session/session-maybe), registerOptions có requirement từng option, ownerProps, keyDomain, slotInject, declaredBy, occupants (ai đã ngồi chỗ đó), và replaceRisk ('shadows-shipped-ui' khi đăng ký vào đây sẽ thay UI có sẵn). Kèm một browser-half tối thiểu làm ví dụ. CLIENT_NOTES bắt buộc inject: ['slots'] và bọc trong ctx.slots.inject(key, () => ctx.slots.register(...)) — slot chỉ tồn tại khi entry khai nó đang mount, đăng ký vào slot chưa khai sẽ throw.
- **how:** Đọc ClientSlotEntry + CLIENT_NOTES
- **solves:** Trả lời câu hỏi khó nhất của UI plugin ('nếu tôi đăng ký vào chỗ này, tôi có làm hỏng UI có sẵn không?') bằng dữ liệu, không bằng đọc code.
- **port effort:** Cao nếu bạn có UI plugin; trung bình nếu chỉ chép mô hình cardinality + occupants. | **idea only:** True
## dsh.61 Đăng ký invariant theo gói qua export ./invariant riêng

- **where:** packages/runtime-diagnostics/invariants/src/index.ts (200 dòng); ví dụ packages/interaction/commands/src/index.ts:~6
- **what:** InvariantInstaller {(ctx, fail), inject?} — mỗi package tự đăng ký check của mình qua ctx.invariants.register(PACKAGE_NAME, install); lọc bằng allowlist/blocklist regex theo tên package; vi phạm ném InvariantError với code='INVARIANT' và packageName. Quy tắc repo (AGENTS.md:132): CHỈ publish ./invariant khi hai quan sát độc lập thực sự có thể phân kỳ; check 'service có tồn tại', 'metadata plugin', 'fixed example' bị coi là vô hiệu.
- **how:** Đọc; verify-package-invariants + verify-built-package-invariants chạy trong CI
- **solves:** Giữ được ràng buộc kiến trúc (ví dụ 'mọi thứ là plugin') như một kiểm tra chạy được thay vì một đoạn AGENTS.md.
- **port effort:** Thấp — pattern nhỏ, tự chứa. | **idea only:** True
## dsh.62 Hook: một protocol chung + bridge ra dialect bên ngoài

- **where:** packages/hooks/hook-protocol/src/ (855 dòng), packages/hooks/hooks-claude-code/, packages/hooks/hooks-codex/
- **what:** hook-protocol định nghĩa HookInvocation {turn, point, dialect, handlerId, matcher} và cặp event bền hook/invoked + hook/result, kèm matcher/merge/runner/codec. hooks-claude-code và hooks-codex map config file bên ngoài lên các extension point của harness, dùng CHUNG một số default (DEFAULT_STDERR_SUMMARY_MAX_CHARS = 500 đặt ở lib chung để 2 bridge không trôi nhau). Ràng buộc: hook phải turn-enclosed và invoked/result phải cặp.
- **how:** Đọc events.ts + runner.ts; extension-cookbook cho biết bridge map lên agent/created, agent/pre-step, agent/request, tools/pre-execute, tools/post-execute, agent/turn-stopping
- **solves:** Tái sử dụng hệ sinh thái hook đã có (Claude Code, Codex) mà không nhân bản semantics vào từng bridge.
- **port effort:** Trung bình. | **idea only:** True
## dsh.63 Plugin hai mặt (host + client) khai bằng manifest dsh.client

- **where:** packages/client/modules/src/index.ts:1-30, packages/client/modules/src/client/{manifest,entries,entry-lifecycle}.ts; ví dụ manifest packages/experimental/client-ui-voice-input/package.json
- **what:** Đây là DUY NHẤT chỗ manifest ghi 'tôi là plugin': dsh.client = {inject, platform, external, immediately} và dsh.bundle.patch = './cordis.patch.yml'. Node half quét các entry của Loader đang sống, dựng window.__DSH_BOOT__ theo thứ tự module-graph, phục vụ bundle + sourcemap, và QUÉT INCREMENTAL — mỗi event internal/plugin đánh dấu tên entry bẩn, một microtask flush đối chiếu với entry đang sống; metadata (kể cả phán quyết 'không phải client package') cache theo specifier.
- **how:** Đọc docstring module; ví dụ manifest thật ở packages/experimental/inspector/package.json
- **solves:** Một plugin = một package npm, có nửa Node và nửa trình duyệt, với đồ thị entry phía browser dựng tự động — không cần bước build riêng cho UI.
- **port effort:** Cao — đây là phần đắt nhất để chép, và cũng là phần M4 có thể bỏ qua ban đầu. | **idea only:** True
## dsh.64 Composition point: preset = cả một Loader tree, mount theo revision

- **where:** packages/preset/agent-preset-registry/src/{mount,composition-inventory,index}.ts (1122 dòng)
- **what:** PresetTree extends EntryTree với override write(): void {} (chỉ config editor bền vững mới ghi). Registry giữ MỌI composition còn sống; mounts là module state nên có thể vượt qua ranh giới runtime Cordis, và người đọc phải truyền root fiber để không lẫn preset giữa hai runtime. Có CompositionRowEnablement = boolean | 'conditional' — khi !!js không evaluate được ngoài mount thì báo 'conditional' chứ không đoán.
- **how:** Đọc mount.ts:8-24 và composition-inventory.ts:10-35
- **solves:** Cho phép 'cá nhân hoá agent' là một cây plugin hoàn chỉnh thay vì một danh sách cờ bật/tắt — và cho phép giữ revision đã bị thay thế cho tới khi người dùng cuối buông.
- **port effort:** Cao. | **idea only:** True
## dsh.65 Volatile config: commit tham chiếu sống mà không remount

- **where:** vendor/loader/src/config/entry.ts:157-195, vendor/loader/src/config/diff.ts (45 dòng); ledger mục #22
- **what:** Khi chỉ giá trị volatile đổi, Entry._commitVolatile() re-parse raw config, so sánh giá trị thường, commit tham chiếu tại chỗ và phát loader/volatile-update CHỈ CHO FIBER SỞ HỮU; nếu một giá trị thường đổi theo thì rơi về vòng remount thường. equalExceptVolatile bỏ qua các đường dẫn volatile cố định bằng schema metadata mà KHÔNG chạy hook/validation.
- **how:** Đọc; test ở scripts/loader-volatile-update.spec.ts và scripts/volatile-config.spec.ts
- **solves:** Cho phép settings đổi trực tiếp một giá trị đang được đọc bởi code đang chạy, mà không mất state của plugin — điều mà reload/remount không làm được.
- **port effort:** Cao — cần cả tầng cosmokit (reference + commit) lẫn diff dựa trên schema. | **idea only:** True
## dsh.66 Slash command và Settings: hai bảng đăng ký nhỏ, tách khỏi model

- **where:** packages/interaction/commands/src/index.ts:69-81, packages/settings/settings/src/index.ts (SettingsForms tại dòng 223)
- **what:** Command: CommandDefinition {definitionId, name, description, input, recordInput, handler}, tên ràng buộc /^[a-z][a-z0-9_-]*$/u, đăng ký qua ctx.invariants.register (tức là cũng là một effect). recordInput: false cho command mà domain event đã giữ payload — tránh ghi trùng vào session log. Settings: SettingsDescriptor + SettingsForms extends Service, form chiếu trường Config volatile, edit ủy quyền cho config-editor (ghi patch dưới file lock + hàng đợi HMR).
- **how:** Đọc; 8 package đăng ký command: plan-mode, command-compact, command-feedback, session-log-export, file-upload, permission-presets, command-goal, client/ui-conversation
- **solves:** Tách 'việc người dùng gõ' khỏi 'việc model gọi' — command không đi qua model, nhưng vẫn là plugin có disposer.
- **port effort:** Thấp. | **idea only:** True
