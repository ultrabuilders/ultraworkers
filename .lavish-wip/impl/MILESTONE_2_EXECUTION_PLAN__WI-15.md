# WI-15 — GAP-M2-10: `/reload` thật (phát `reason: "reload"`)

> Kế hoạch: `MILESTONE_2_EXECUTION_PLAN.md:1283` (`## WI-15`)
> Cây đối chiếu: `/Users/tranquangdang21/Projects/ultraworkers` @ `65cc6c1`
> Tham chiếu chéo: `/Users/tranquangdang21/Projects/pi-ref` (pi có đường nối; omp không)
> Ngày đối chiếu: 2026-09-29

---

## 0. Kết quả kiểm lại từng neo

| Neo trong sổ | Lệnh đã chạy | Kết quả |
| --- | --- | --- |
| `builtin-session.ts:672` | `sed -n '672p'` | `{ name: "reload", description: "Force reload MCP runtime tools" },` — **ĐÚNG.** |
| `builtin-lifecycle.ts:871` | `sed -n '871p'` | `async function rescopeHeadlessToCwd(runtime: SlashCommandRuntime, cwd: string): Promise<void> {` — **ĐÚNG.** |
| `builtin-lifecycle.ts:116/133/137/142` | `rg -n 'rescopeHeadlessToCwd'` | `grep -n` trả về `116`, `133`, `137`, `142` (gọi) và `871` (định nghĩa) — **ĐÚNG, đúng bốn call site.** |
| `types.ts:743` | `sed -n '743p'` | `	reason: "startup" \| "reload";` — **ĐÚNG.** |
| `builtin-session.ts:672` "chỉ làm MCP" | đọc `handleMcpAcp` | **ĐÚNG** — lệnh nằm trong khối `handle: handleMcpAcp` của nhóm MCP. |
| "bốn thứ `rescopeHeadlessToCwd` gọi đủ" | `sed -n '871,882p'` | **ĐÚNG, và còn hơn bốn.** Ngoài `reloadForCwd` / `refreshSkillsAndCommands` / `refreshCommands` / `reloadPlugins`, hàm còn gọi `setProjectDir(cwd)`, `rebindMemoryBackendForCwd(runtime.session)`, `clearClaudePluginRootsCache()`, `discoverTitleSystemPromptFile(cwd)`, `runtime.session.setTitleSystemPrompt(p)`. |

**Các điểm sổ SAI so với cây thật — không sửa trong tài liệu, ghi ra ở đây:**

| # | Sổ nói | Cây thật |
| --- | --- | --- |
| **S1** | `loader.ts` "sửa — Nhận `reason: "reload"` từ call site mới" | `rg -n 'reason' packages/coding-agent/src/extensibility/extensions/loader.ts` → **0 hit**. `loader.ts` **không hề có tham số `reason`**. File này gần như không liên quan. |
| **S2** | "Nhánh `reason: "reload"` trong **loader**" | Nhánh nằm trong `types.ts:743` (kiểu) và `runner.ts:1696-1736` (hàm phát). Không có "nhánh" nào trong loader. |
| **S3** | "Thiếu đúng hai thứ: một entry slash command và một call site emit" | **Thiếu nhiều hơn hai.** `rg -n 'emitResourcesDiscover' packages` → chỉ **một** hit: chính khai báo ở `runner.ts:1696`. **Không có call site nào ở omp** — kể cả `reason: "startup"`. |
| **S4** | "Effort: S — khoảng nửa ngày" | S là đúng **chỉ khi** phạm vi được thu hẹp đúng. Nếu giữ nguyên phạm vi sổ mô tả (chỉ nối `reason` xuống loader) thì mục này **không làm được gì**: gọi `emitResourcesDiscover` mà bỏ qua kết quả cũng giống hôm nay. Xem §6. |
| **S5** | "Bị chặn cho tới khi có native addon: `bun test` chết ngay ở bước import" | **Đã hết hạn.** `bun -e 'import("@oh-my-pi/pi-natives")…'` tại cây này in `natives OK`. `node_modules/@oh-my-pi/pi-natives` là symlink → `packages/natives`, addon đã build sẵn. Lệnh `bun --cwd=packages/natives run build` trong sổ là thừa. |
| **S6** | "đã có **bốn** call site … bốn call site sẵn có" | Bốn call site là của `/move` (`relocateHeadlessSession` tại `builtin-lifecycle.ts:92`), **không phải** của một lệnh reload. Xem §1. |

---

## 1. Cái gì thay đổi, quan sát được

Gõ `/reload` trong một phiên có extension, handler `resources_discover` của extension chạy lại với `reason: "reload"` thay vì im lặng — và nếu handler trả về đường dẫn skill/prompt mới, các đường dẫn đó xuất hiện trong danh sách skill sau một lần gõ, không cần khởi động lại tiến trình.

**Câu này chỉ thành đúng sự thật nếu cả ba tầng dưới được nối.** Sổ chỉ mô tả tầng một. Đo lại ở `65cc6c1`:

```
emitResourcesDiscover   (runner.ts:1696)  ← có, KHÔNG có call site nào ở omp
        ↓
extendResourcesFromExtensions            ← KHÔNG TỒN TẠI ở omp
        ↓
resourceLoader.extendResources           ← KHÔNG TỒN TẠI ở omp (shim cố ý bỏ, xem dưới)
```

`packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts:919` nói thẳng, nguyên văn:

```
 * The pi surface it emulates is the intersection actually used by real
 * extensions in the wild — themes are silently dropped (OMP has no
 * session-level themes surface); `extendResources`, `loadProjectTrustExtensions`,
 * and provider-trust hooks are omitted.
```

Vậy `emitResourcesDiscover` trả về `{ skillPaths, promptPaths, themePaths }` rồi **không ai đọc**. Đây không phải "thiếu một call site", đây là **cả đường ống chưa từng được nối vào omp**.

### Bằng chứng đối chiếu: pi ĐÃ nối, omp chưa

`/Users/tranquangdang21/Projects/pi-ref` (cây `pi`, không phải omp) — **có** call site, tại `src/core/agent-session.ts`:

- `:2949` — `const { skillPaths, promptPaths, themePaths } = await this._extensionRunner.emitResourcesDiscover(`
- `:2944` — `private async extendResourcesFromExtensions(reason: "startup" | "reload"): Promise<void> {`
- `:3314` — `await this.extendResourcesFromExtensions("reload");` ← **đây là chỗ `reason: "reload"` thật sự được phát**
- `:3313` — `await this._extensionRunner.emit({ type: "session_start", reason: "reload" });`
- `SessionStartEvent` của pi (`src/core/extensions/types.ts:574-579`) **có** trường `reason: "startup" | "reload" | "new" | "resume" | "fork"`.

OMP (`shared-events.ts:30-32`) — `SessionStartEvent` **không có** trường `reason`:

```ts
/** Fired on initial session load */
export interface SessionStartEvent {
	type: "session_start";
}
```

`/Users/tranquangdang21/Projects/gajae-ref` cũng chỉ có khai báo `emitResourcesDiscover` (`runner.ts:1606`), không có call site — giống omp. `deepseek-harness`, `codex-ref`, `opencode-ref`, `claude-code-ref` không có symbol này.

### Hệ quả cho phạm vi

Sổ ghi Effort S "khoảng nửa ngày". Điều đó **chỉ đúng** nếu bản sửa được giới hạn ở: phát `emitResourcesDiscover(cwd, "reload")` từ một lệnh mới, và **trả về kết quả cho người gọi**. Nếu chỉ phát rồi bỏ, thì đây là một lời gọi hàm mà không ai dùng kết quả — đúng loại code chết mà work item sinh ra để dẹp thì lại dựng thêm một.

---

## 2. Bảng điểm sửa

Trước hết, ba chỗ phải sửa để tầng giữa tồn tại. Không sửa chúng thì bước 2 vô nghĩa.

| path | symbol | TRƯỚC (nguyên văn từ file) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `src/extensibility/shared-events.ts:31` | `SessionStartEvent` | `	type: "session_start";`<br>`}` | `type: "session_start";`<br>`	/** Why this session start happened. */`<br>`	reason: "startup" \| "reload" \| "new" \| "resume" \| "fork";`<br>`	/** Previously active session file. Present for "new", "resume", "fork". */`<br>`	previousSessionFile?: string;`<br>`}` |
| `src/slash-commands/builtin-lifecycle.ts:871` | `rescopeHeadlessToCwd` | `async function rescopeHeadlessToCwd(runtime: SlashCommandRuntime, cwd: string): Promise<void> {`<br>`	setProjectDir(cwd);`<br>`	await runtime.settings.reloadForCwd(cwd);` | Thêm tham số thứ ba **có mặc định** để bốn call site của `/move` không đổi:<br>`async function rescopeHeadlessToCwd(runtime, cwd, reason: ExtensionResourcesReason = "reload"): Promise<void>`<br>+ gọi `await runtime.session.extensionRunner?.emitResourcesDiscover(cwd, reason)` ở **cuối** hàm, sau `await runtime.reloadPlugins()` (dòng 881). |
| `src/slash-commands/builtin-lifecycle.ts:871` | phạm vi hàm | (không có `export`) | `export async function rescopeHeadlessToCwd(...)` — cần export để entry lệnh mới ở file khác gọi được, hoặc đặt entry lệnh mới **cùng file**. |
| `src/slash-commands/builtin-marketplace.ts:556` | `BUILTIN_MARKETPLACE_SLASH_COMMANDS` | `{`<br>`	name: "reload-plugins",`<br>`	icon: "restart",`<br>`	description: "Reload all plugins (skills, commands, hooks, tools, agents, MCP)",` | **Không đổi dòng nào.** Đây là lệnh reload-tất-cả **đã có sẵn**. Xem bảng quyết định §7. |
| `src/slash-commands/builtin-session.ts:672` | `name: "reload"` | `			{ name: "reload", description: "Force reload MCP runtime tools" },` | **Không đổi dòng nào** (nếu chọn phương án B ở §7). Sổ cấm đổi nghĩa lệnh cũ. |

### Điểm cần thêm tầng giữa — chọn một trong hai

| phương án | ở đâu | Hình dạng |
| --- | --- | --- |
| **A. Sửa dùng `session.extensionRunner`** | `agent-session.ts:12342` đã có sẵn `get extensionRunner(): ExtensionRunner \| undefined { return this.#extensionRunner; }` | `emitResourcesDiscover` trả `skillPaths/promptPaths/themePaths`; OMP cần chỗ nhận. Ôm chỗ này xem `refreshSkillsAndCommands` (`agent-session.ts:5944`) — nó gọi `loadSlashCommands({ cwd, extensionRoots: this.effectiveExtensionRoots })` và `this.#tools.refreshSkills()`. Không có tham số "extra paths". **Cần thêm.** |
| **B. Chỉ phát, không nhận** | `builtin-lifecycle.ts` | `await runtime.session.extensionRunner?.emitResourcesDiscover(cwd, reason);` và bỏ kết quả. |

**Phương án B là cái rẻ, và là cái mà câu "S — nửa ngày" của sổ đang mô tả.** Nhưng nó tạo ra một lời gọi hàm mà kết quả bị vứt — người đọc code sau này sẽ hỏi đúng câu mà work item này sinh ra để trả lời. **Nếu chọn B thì phải nói rõ trong PR rằng đây là bước một, và `reason: "reload"` vẫn chưa làm được gì quan sát được** — nghĩa là "cái gì thay đổi quan sát được" ở §1 phải bị cắt xuống còn "handler chạy lại", không phải "skill mới xuất hiện".

Cây tham chiếu cho phương án A là `pi-ref/src/core/agent-session.ts:2944-2981` (`extendResourcesFromExtensions` + `buildExtensionResourcePaths`). OMP không có `ResourceLoader` (`rg -n 'resourceLoader' src` chỉ trả về shim tương thích legacy), nên **A là viết tầng mới**, không phải nối dây.

---

## 3. Các bước, mỗi bước có neo đã kiểm

### Bước 0 — Ghi lại trước khi viết: `rescopeHeadlessToCwd` KHÔNG phải tầng reload

Sổ gọi nó là "đường reload đã tồn tại" và dựng cổng (2) trên việc "không nhân bản" nó. Đúng một nửa: nó là **đường re-scope cwd** của `/move`.

Bốn call site (`:116`, `:133`, `:137`, `:142`) đều nằm trong `relocateHeadlessSession` (`builtin-lifecycle.ts:92`), tức là đường `/move` và **rollback của `/move`**. Kiểm bằng `sed -n '92,150p'`: lệnh `/move` khai ở `builtin-lifecycle.ts:722`.

Hệ quả trực tiếp: **thêm một call site thứ năm cho `rescopeHeadlessToCwd` sẽ làm cổng (2) của sổ đỏ** — cổng đó đòi "vẫn còn **đúng bốn** call site". Cổng đó viết sai (xem §5).

*(neo đã kiểm: `builtin-lifecycle.ts:116`, `:133`, `:137`, `:142`, `:871`, `:92`, `:722`)*

### Bước 1 — Quyết trước: `/reload` cũ hay lệnh mới

Chặn. Xem §7. Cần câu trả lời **trước bước 2**, vì nó quyết định lệnh mới đặt ở file nào.

*(neo: `builtin-session.ts:672` — `{ name: "reload", description: "Force reload MCP runtime tools" },`; `builtin-marketplace.ts:556` — `name: "reload-plugins"`)*

### Bước 2 — Mở `SessionStartEvent.reason` nếu chọn đi qua `session_start`

Hiện `runner.ts:3313`-tương-đương **không tồn tại** ở omp: các nơi phát `session_start` (`runtime-init.ts:164`, `extension-ui-controller.ts:326-329`, `acp-agent.ts:2648`, `task/executor.ts:4237`) đều phát `{ type: "session_start" }` trần, không có `reason`.

Nếu chọn đường "emit `session_start` với `reason` rồi bắt handler", phải sửa `shared-events.ts:30-32` và cập nhật **cả bốn** call site phát ở trên, nếu không thì `reason` là bắt buộc-nhưng-không-ai-truyền và `bun check` sẽ đỏ — đó là cách tự bảo vệ, nhưng nghĩa là phạm vi rộng hơn sổ mô tả.

*(neo đã kiểm: `shared-events.ts:30-32`; `runtime-init.ts:164`; `extension-ui-controller.ts:326`; `acp-agent.ts:2648`; `task/executor.ts:4237`)*

### Bước 3 — Nối `emitResourcesDiscover` vào hàm tái-scope

Sửa `builtin-lifecycle.ts:871`. Thêm tham số có mặc định để `/move` không đổi hành, gọi ở cuối hàm (sau dòng 881 `await runtime.reloadPlugins();`).

Thứ tự này có lý do: `emitResourcesDiscover` duyệt `this.extensions` của runner và trả về đường dẫn; nếu phát trước `reloadPlugins()`, người dùng sẽ phải reload hai lần mới thấy skill mới. Đặt sau.

*(neo đã kiểm: `builtin-lifecycle.ts:871`, `:881`; `runner.ts:1696`)*

### Bước 4 — Thêm entry slash command gọi hàm đó

Mẫu để chép, lấy từ `/reload-plugins` (`builtin-marketplace.ts:555-571`):

```ts
{
	name: "reload-plugins",
	icon: "restart",
	description: "Reload all plugins (skills, commands, hooks, tools, agents, MCP)",
	acpDescription: "Reload all plugins",
	handle: async (_command, runtime) => {
		await runtime.reloadPlugins();
		await runtime.output("Plugins reloaded.");
		return commandConsumed();
	},
	handleTui: async (_command, runtime) => {
		await reloadTuiPluginState(runtime.ctx);
		runtime.ctx.showStatus("Plugins reloaded.");
		runtime.ctx.editor.setText("");
	},
},
```

Lưu ý bất đối xứng bắt buộc phải giữ: `handle` đi qua `runtime.reloadPlugins()`, còn `handleTui` đi qua `reloadTuiPluginState(runtime.ctx)` — **hai hàm khác nhau** (`builtin-marketplace.ts:30` và `builtin-registry.ts:169` / `acp-agent.ts:982` / `rpc-mode.ts:1155` là ba bản khác nhau của `reloadPlugins`). Lệnh mới phải phủ **cả hai**, nếu không thì ACP/RPC có hành vi khác TUI — đúng cái hỏng mà `acp-agent.test.ts:1786` (`refreshes task agent descriptions on ACP /reload-plugins`) đang canh.

*(neo đã kiểm: `builtin-marketplace.ts:555-571`; `builtin-registry.ts:169`; `acp-agent.ts:982`; `rpc-mode.ts:1155`)*

### Bước 5 — Chọn phương án A hay B ở §2, và viết nó

B thì hai dòng. A thì phải thêm đường nhận `skillPaths`/`promptPaths`/`themePaths` vào tầng refresh của omp — mà omp không có chỗ đó.

*(neo đã kiểm: `agent-session.ts:12342` `get extensionRunner()`; `agent-session.ts:5944` `refreshSkillsAndCommands()`; `legacy-pi-coding-agent-shim.ts:919`)*

### Bước 6 — Xác nhận trước khi reload extension đang chạy

Sổ ghi "bắt buộc" vì teardown chạm timer, nhưng không nêu hình thức. Xem §7 câu hỏi thứ hai.

*(neo: không — sổ tự ghi "(neo: không)")*

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/reload-extension-resources.test.ts` (mới)

**Khung dựng:** chép từ `packages/coding-agent/test/reload-plugins-mcp.test.ts` — file này đã có sẵn đúng cái khuôn cần dùng:
- `createFakeCtx(cwd, settingsValues)` (`:42-66`) trả `{ ctx, mcpManager, session, mcpTools }` với `vi.fn()` sẵn
- `runtime: TuiSlashCommandRuntime = { ctx }` (`:86`)
- `executeBuiltinSlashCommand("/reload-plugins", runtime)` (`:86`)
- `beforeEach` tạo `fs.mkdtemp` + `setProjectDir`; `afterEach` có `vi.restoreAllMocks()` + `setProjectDir(originalProjectDir)` (`:70-81`) — giữ nguyên, đây là ràng buộc "full-suite safe" trong AGENTS.md

Dựng `ExtensionRunner` thật: `new ExtensionRunner([extension], new ExtensionRuntime(), cwd, sessionManager, modelRegistry)` — mẫu từ `extensions-runner.test.ts:4088` (`new ExtensionRunner([extension], new ExtensionRuntime(), tempDir.path(), sessionManager, modelRegistry)`).

### Các case

1. **`/reload` cũ vẫn chỉ làm MCP** — hồi quy âm thầm. Gọi `executeBuiltinSlashCommand("/reload", runtime)`, khẳng định handler `resources_discover` **không** chạy. Đây là case chặn việc đổi nghĩa lệnh cũ.
2. **Lệnh mới phát `reason: "reload"`** — extension đăng ký `api.on("resources_discover", handler)` ghi lại `event.reason` vào mảng; sau lệnh, `expect(captured).toEqual(["reload"])`. Đây là case **duy nhất** chứng minh hợp đồng của work item.
3. **`/move` không phát `reason: "reload"`** — hồi quy âm thầm ngược lại. `relocateHeadlessSession` dùng tham số mặc định; khẳng định `/move` đi qua vẫn cho `"startup"` hoặc không phát. Bắt việc thêm tham số không làm đổi hành `/move`.
4. **(chỉ khi chọn phương án A) đường dẫn trả về thực sự được dùng** — handler trả `{ skillPaths: [<đường dẫn thật trong tmpdir>] }`; khẳng định skill đó xuất hiện trong danh sách sau lệnh. Đây là case biến "cái gì thay đổi quan sát được" ở §1 từ lời hứa thành sự thật.

### Người dùng thấy gì nếu hồi quy

- Thiếu case 2: gõ lệnh reload, không có gì xảy ra, và `emitResourcesDiscover` vẫn là một hàm không ai gọi. Đúng loại hỏng sổ mô tả.
- Thiếu case 1: `/reload` đột nhiên nạp lại extension giữa lúc người dùng chỉ muốn refresh MCP. Đây là hồi quy **người dùng thấy**, không phải refactor.
- Thiếu case 3: `/move` bắt đầu chạy handler `resources_discover` với `reason: "reload"` mỗi lần rollback — hành vi mới, không ai hỏi, không ai test.

---

## 5. Cổng

### (1) Cổng "nhánh không chết" — **KHÔNG ĐỎ ĐƯỢC, phải viết lại**

Sổ dùng:
```bash
grep -rn 'reason: "reload"' packages --include='*.ts'
```
Kết quả tôi đo được ở `65cc6c1`: **0 hit, exit code 1.** Sau khi sửa, lệnh này sẽ ra ≥1 hit **chỉ khi** bạn viết đúng chữ `reason: "reload"` như một object literal.

**Vấn đề:** đây là cổng văn bản, không phải cổng hành vi. Nếu implementation truyền `reason` qua biến (`emitResourcesDiscover(cwd, reason)` với `reason = "reload"` ở trên), `grep` vẫn ra **0 hit** và cổng báo đỏ trong khi việc đã xong đúng. Ngược lại, một dòng `{ reason: "reload" }` chết cũng làm cổng xanh.

**Viết lại thành cổng hành vi:**
```bash
# Đếm call site THẬT của emitter, không đếm khai báo.
rg -n 'emitResourcesDiscover' packages/coding-agent/src -g '*.ts' | grep -v 'async emitResourcesDiscover'
# expected: ≥1 dòng — và dòng đó phải nằm ngoài runner.ts
```
Đỏ được **không** nếu không dòng nào; xanh **giả** nếu dòng đó lại là một khai báo. Và case test 2 ở §4 là nơi thật sự chứng minh.

### (2) Cổng "không nhân bản tầng reload" — **viết sai, phải viết lại**

Sổ đòi: `rescopeHeadlessToCwd` "vẫn còn **đúng bốn** call site".

**Cổng này mâu thuẫn với chính bước 2 của sổ.** Bước 2 bảo thêm entry lệnh gọi lại hàm đó — làm call site thành năm. Cổng lại đòi đúng bốn. Một trong hai phải sai.

Ý định thật của cổng là "đừng dựng tầng reload thứ hai", và điều đó nên kiểm bằng **đếm tên hàm định nghĩa**, không phải đếm call site:
```bash
rg -c 'async function rescopeHeadlessToCwd' packages/coding-agent/src/slash-commands/builtin-lifecycle.ts
# expected: 1 — định nghĩa không nhân bản
rg -n 'reloadForCwd|refreshSkillsAndCommands' packages/coding-agent/src/slash-commands/ -g '*.ts'
# expected: chỉ còn trong rescopeHeadlessToCwd, không có bản sao thứ hai
```
Đỏ được **có**: dựng thêm một hàm reload thứ hai sẽ làm dòng thứ hai trả về file khác.

### (3) Cổng "hành vi lệnh cũ giữ nguyên" — **ĐỎ ĐƯỢC**

```bash
grep -rn 'name: "reload"' packages --include='*.ts'
# expected: chính xác 1 hit, và nội dung phải là:
#   { name: "reload", description: "Force reload MCP runtime tools" },
```
Đo được ở `65cc6c1`: đúng một hit, `builtin-session.ts:672`. Đỏ được **có** — sửa mô tả hoặc đổi `handle` sẽ đỏ. Nhưng nó **không** bắt được việc lệnh cũ bị nối thêm hành mới mà vẫn giữ nguyên dòng metadata; case test 1 ở §4 mới bắt được cái đó. Giữ cả hai.

### Lệnh build/test

```bash
bun run check:ts          # chạy được, không cần native addon
bun test packages/coding-agent/test/reload-extension-resources.test.ts
```

**Sổ nói `bun test` chết vì thiếu native addon — điều đó đã hết hạn.** Tôi đã chạy `bun -e 'import("@oh-my-pi/pi-natives")…'` tại cây này: in `natives OK`. `node_modules/@oh-my-pi/pi-natives` là symlink → `packages/natives`. Không cần `bun --cwd=packages/natives run build`.

### `gate_can_fail`

Cổng (1) như sổ viết: **không** (`grep` văn bản, xanh giả dễ xảy ra hơn đỏ thật).
Cổng (1) sau khi viết lại: **có**, nhưng yếu hơn một test.
Cổng (2) như sổ viết: **không** (mâu thuẫn bước 2 của chính sổ).
Cổng (2) sau khi viết lại: **có**.
Cổng (3): **có**.

---

## 6. Cạm bẫy riêng của work item này

**Cạm bẫy lớn nhất: nối xong mà vẫn không làm được gì quan sát được, và không ai nhận ra.**

`emitResourcesDiscover` trả `{ skillPaths, promptPaths, themePaths }`. Ở omp, **không tồn tại chỗ nào nhận ba mảng đó** — `legacy-pi-coding-agent-shim.ts:919` ghi rõ `extendResources` bị bỏ có chủ đích. Nên cách hiểu sai rẻ nhất là: gọi `await runner.emitResourcesDiscover(cwd, "reload")`, bỏ kết quả, thấy cổng grep xanh, ship. Handler chạy, nhưng extension trả về skill mới thì skill đó **không xuất hiện** — và không có gì trong test đỏ, vì test chỉ assert "handler được gọi".

Đây là hỏng đúng loại work item này sinh ra để dẹp. Phải chọn trước giữa A và B ở §2 và nói rõ trong PR.

**Cạm bẫy thứ hai: đếm call site để làm cổng.** Sổ tự mâu thuẫn (bước 2 thêm call site, cổng (2) đòi đúng bốn). Đừng viết cổng đếm call site của một hàm mà chính work item yêu cầu gọi thêm.

**Cạm bẫy thứ ba: bất đối xứng `handle` / `handleTui`.** `/reload-plugins` hiện dùng `runtime.reloadPlugins()` ở `handle` nhưng `reloadTuiPluginState(ctx)` ở `handleTui`, và đó là **hai hàm khác nhau** với ba bản hiện thực khác nhau theo mode (TUI / ACP / RPC). Lệnh mới chỉ phủ một nhánh là TUI và ACP lệch nhau. `acp-agent.test.ts:1786` đang canh đúng chỗ này cho `/reload-plugins`.

**Cạm bẫy thứ tư: `/reload-plugins` đã tồn tại và làm gần đúng việc này.** Nó ở `builtin-marketplace.ts:556`, có `acpDescription`, có test riêng (`reload-plugins-mcp.test.ts`, ba case). Thêm `/reload-extensions` cạnh nó là **bề mặt thứ ba** cho cùng một việc — câu hỏi ở §7 cần trả lời *trước*, không phải sau.

**Cạm bẫy thứ năm: `runtime.session.extensionRunner` là `get` trần, trả `undefined` khi session không có runner.** `agent-session.ts:12342-12344` trả `this.#extensionRunner`, và `sdk.ts:3083-3087` giải thích runner được tạo **vô điều kiện** — nhưng chỉ trong `createAgentSession`. Đường RPC/ACP test-harness có thể không có. Dùng `?.` và đừng coi `undefined` là lỗi.

---

## 7. Câu hỏi cần người quyết (chặn bước 2)

### Q1 — `/reload` cũ nâng lên, hay thêm lệnh riêng? (chặn bước 2)

Sổ nêu cả hai đều chấp nhận được và cấm đổi nghĩa lệnh cũ. Đo bổ sung mà sổ không có: **đã có sẵn `/reload-plugins`** ở `builtin-marketplace.ts:556` với `description: "Reload all plugins (skills, commands, hooks, tools, agents, MCP)"` và ba test riêng. Nên thực tế có **ba** lựa chọn chứ không phải hai:

- **(A1) Nâng `/reload`.** Ít lệnh nhất, đổi hành người đang dùng. Phá case test 1 ở §4.
- **(A2) Thêm lệnh thứ ba.** Giữ hành cũ, thêm một bề mặt gần trùng `/reload-plugins`. Ba lệnh cùng làm một việc là bản trọn sẽ đẩy về phía người quyết ở WI-2.
- **(A3) Mở rộng `/reload-plugins`.** Không thêm lệnh nào, không đổi nghĩa lệnh nào. `/reload` vẫn chỉ MCP. Khớp nhất với cảnh báo "đừng viết tầng reload thứ hai".

**Khuyến nghị: A3.** Lý do cụ thể — mục tiêu của WI-2 là chốt quy tự trùng tên, và ba lệnh reload gần như trùng nhau là đúng thứ gây gánh. Nhưng đây là quyết định sản phẩm, không phải quyết định kỹ thuật.

### Q2 — Có hỏi xác nhận trước khi reload extension không? (chặn bước 3)

Sổ nói bắt buộc về cơ chế (teardown chạm timer) nhưng không nêu hình thức. Ba lựa chọn: hỏi luôn / hỏi khi có extension đang chạy / không hỏi.

Đo bổ sung: `/reload-plugins` hiện **không hỏi** (`builtin-marketplace.ts:559-563` gọi thẳng `await runtime.reloadPlugins()` rồi `runtime.output("Plugins reloaded.")`). Nếu WI-15 thêm hỏi vào lệnh mới, thì hai lệnh reload khác nhau về hành vi an toàn — và lệnh *rộng hơn* (`/reload-plugins`) lại không hỏi. Lệnh nào phải hỏi là một quyết định nhất quán, không chỉ là chi tiết của WI-15.

### Q3 — Phương án A hay B ở §2? (chặn bước 5)

B = phát rồi bỏ kết quả, hai dòng, đúng với ước lượng "S — nửa ngày", nhưng tạo code chết mới.
A = nối thật, cần dựng tầng nhận `skillPaths`/`promptPaths`/`themePaths` mà omp chưa có (`legacy-pi-coding-agent-shim.ts:919` xác nhận `extendResources` bị bỏ), và effort không còn là S.

Sổ đang mô tả B mà gọi nó là "reload thật". Cần chọn rõ và sửa câu "Người dùng thấy" ở §1 cho khớp.

---

## 8. Phụ thuộc

- **`depends_on`: WI-2 — CỨNG.** Giữ nguyên lý do của sổ: reload là nơi quy tắc trùng tên chạy nhiều lần nhất. Bổ sung: nếu chọn A3 ở Q1 thì WI-15 **không thêm** lệnh mới, nên rủi ro trùng tên **giảm**, và mức phụ thuộc cũng giảm theo.
- **`blocks`: không.**

## 9. Tóm tắt trạng thái

| mục | trạng thái |
| --- | --- |
| Neo `builtin-session.ts:672` | ✅ đúng |
| Neo `builtin-lifecycle.ts:871` | ✅ đúng |
| Neo `builtin-lifecycle.ts:116/133/137/142` | ✅ đúng (đúng bốn) |
| Neo `types.ts:743` | ✅ đúng |
| Claim "`loader.ts` nhận `reason`" | ❌ sai — 0 hit trong loader.ts |
| Claim "thiếu đúng hai thứ" | ❌ thiếu nhiều hơn — `emitResourcesDiscover` có **0** call site ở omp |
| Claim "bốn call site của tầng reload" | ⚠️ nửa đúng — chúng là của `/move`, không phải của reload |
| Claim "bị chặn vì native addon" | ❌ hết hạn — addon load được |
| Cổng (1) | ❌ không đỏ được như sổ viết — đã viết lại |
| Cổng (2) | ❌ mâu thuẫn bước 2 — đã viết lại |
| Cổng (3) | ✅ đỏ được |
