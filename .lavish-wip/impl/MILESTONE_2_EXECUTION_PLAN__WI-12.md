# WI-12 — Cho phép extension đóng góp MCP server (CHỈ THIẾT KẾ)

> Phiếu triển khai. Nguồn: `MILESTONE_2_EXECUTION_PLAN.md:4354-4565`.
> Mọi neo trong phiếu này đã được mở và đọc tại HEAD `65cc6c1` (`808b365` mà spec ghi đã trôi).
> Kế hoạch KHÔNG bị sửa. Chỗ nào spec sai, phiếu này ghi ra.

---

## 1. Cái gì thay đổi, quan sát được

Một tài liệu quyết định mới, `docs/mcp-server-contribution-by-extensions.md`, xuất hiện trong `docs/` và trả lời bằng văn bản bốn câu mà hôm nay không ai trả lời được: một extension **đã nạp** đóng góp MCP server theo cách nào (một trong hai kiến trúc, có khuyến nghị và lý do), nó nằm ở trust tier nào, credential của nó lấy từ đâu, và toggle enable/disable của người dùng có ghi đè được cờ `enabled` do extension sở hữu hay không — kèm hai dòng trỏ mới trong `docs/extensions.md` và `docs/mcp-config.md`.

**Không có dòng source nào đổi.** Không có hành vi runtime nào đổi. Người dùng cuối không thấy gì khác giữa PR này và một nhánh đứng yên.

---

## 2. Bảng điểm sửa

Ba dòng DUY NHẤT được chấm. `TRƯỚC` trích nguyên văn từ file thật tại HEAD `65cc6c1`.

| đường/dẫn | symbol / vị trí | TRƯỚC (nguyên văn) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `docs/mcp-server-contribution-by-extensions.md` | file mới, 6 phần bắt buộc | *không tồn tại* (`ls` → `No such file or directory`) | Văn xuôi, 6 phần theo đúng thứ tự hàng 1 của bảng file trong spec. KHÔNG phải checklist. |
| `docs/extensions.md` | bullet `- \`mcp_notification\`` ngay dưới `### MCP notifications` | `docs/extensions.md:393` — `- \`mcp_notification\` — fired for every JSON-RPC notification received from a connected MCP server, AFTER the manager's own handling of known list/update methods (…). Notifications received before any listener attaches are buffered (bounded FIFO, cap 100, drop-oldest) and drained into the first subscriber — so startup-time frames aren't lost even if the extension binds after MCP discovery.` | Một bullet MỘT dòng ngay sau bullet đó, cùng hình dạng `-` + backtick + tên + `—`. Nội dung: extension đã nạp KHÔNG thể đóng góp MCP server lúc runtime, và trỏ tới file mới. |
| `docs/mcp-config.md` | bullet nguồn MCP, hoặc item #2 trong danh sách thứ tự ưu tiên | `docs/mcp-config.md:40` — `- installed Claude marketplace plugins and OMP extension packages that declare MCP servers` | Thêm một dòng ngay sau nó, nói rõ: khai báo ở tầng package ĐÃ CÓ trong cây; đóng góp lúc runtime theo mệnh lệnh đã được thiết kế nhưng chưa build, trỏ tới file mới. |
| `packages/coding-agent/src/extensibility/extensions/types.ts` | `ExtensionAPI` | — | **KHÔNG SỬA.** Chỉ-đọc. Chạm vào = item đã bị hiện thực hoá. |
| `packages/coding-agent/src/mcp/manager.ts` | `MCPManager` | — | **KHÔNG SỬA.** Chỉ-đọc. |
| `packages/coding-agent/src/capability/mcp.ts` | `MCPServer` / `mcpCapability` | — | **KHÔNG SỬA.** Chỉ-đọc. |
| `packages/coding-agent/src/modes/components/extensions/dashboard-runtime.ts` | `persistMcpToggle` / `applyMcpToggle` | — | **KHÔNG SỬA.** Chỉ-đọc. |
| `packages/tui/src/overlays/extensions/extension-dashboard.ts` | `#writableMcpSourcePath` | — | **KHÔNG SỬA.** Chỉ-đọc. |

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

Mọi dòng `đường/dẫn:dòng` trong phần này là số dòng **đã mở và đọc** tại HEAD `65cc6c1`, không phải số trong spec.

### Bước 0 — Chốt lại cây (chặn, phải làm trước tiên)

```bash
git rev-parse --short HEAD
#   observed: 65cc6c1   (spec ghi 808b365 → đã trôi)
```

Spec tự nó yêu cầu điều này ở `MILESTONE_2_EXECUTION_PLAN.md:4379`. Không dùng bất kỳ neo `types.ts` nào của spec — xem mục 6.

### Bước 1 — Đọc lại vị trí thật của năm thành viên MCP-extension (thay bước 3 của spec)

**Số dòng trong spec đã hỏng. Dùng bảng dưới.**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
grep -n 'mcpServerName?: string;\|mcpToolName?: string;\|export interface McpNotificationEvent\|export interface ExtensionAPI\|on(event: "mcp_notification"\|approval?: ToolApproval' \
  packages/coding-agent/src/extensibility/extensions/types.ts
```

| spec ghi | thật | lệch | file:dòng thật |
| --- | --- | --- | --- |
| `:663` `mcpServerName` | `:665` | +2 | `types.ts:665` — `	mcpServerName?: string;` (doc `:664`) |
| `:665` `mcpToolName` | `:667` | +2 | `types.ts:667` — `	mcpToolName?: string;` (doc `:666`) |
| `:658` `ToolDefinition.approval` | `:660` | +2 | `types.ts:660` — `	approval?: ToolApproval;` (doc `:658-659` nói `Defaults to "exec" when omitted.`) |
| `:672` `sourcePath` | `:674` | +2 | `types.ts:674` |
| `:904` `McpNotificationEvent` | `:924` | +20 | `types.ts:924-936`; `type:` ở `:925`, `server:` ở `:931`, `method:` ở `:933`, `params:` ở `:935` |
| `:1149` merge vào event map | `:1170` | +21 | `types.ts:1170` — `	| McpNotificationEvent` |
| `:1256` `ExtensionAPI` | `:1277` | +21 | `types.ts:1277` — `export interface ExtensionAPI {` |
| `:1340` `on("mcp_notification")` | `:1365` | +25 | `types.ts:1365` |
| `:1347` `registerTool` | `:1372` | +25 | `types.ts:1372` |
| `:1379` `registerFileWriteFallback` | `:1404` | +25 | `types.ts:1404` |
| `:1411` `registerCommand` | `:1436` | +25 | `types.ts:1436` |
| `:1421` `registerShortcut` | `:1446` | +25 | `types.ts:1446` |
| `:1430` `registerFlag` | `:1455` | +25 | `types.ts:1455` |
| file dài 1849 dòng | **1874 dòng** | +25 | `wc -l types.ts` → 1874 |

Xác nhận tiêu cực (không có method đóng góp MCP nào):

```bash
grep -n 'registerMcp\|registerMcpServer\|McpServer' packages/coding-agent/src/extensibility/extensions/types.ts
#   observed: KHÔNG có dòng nào (exit 1). Đúng như spec nói.
```

Và `mcp` trong `types.ts` chỉ có 6 hit, đều là chiều vào: `:665`, `:667`, `:719` (doc của `SourceInfo.source`), `:925`, `:928` (doc của `server`), `:1365`.

### Bước 2 — Đính chính tiền đề: package ĐÃ đóng góp MCP server theo khai báo

```bash
grep -n 'MCP_FILENAMES\|loadMCPServers\|registerProvider<MCPServer>' packages/coding-agent/src/discovery/omp-plugins.ts
#   observed: 275, 293, 423
```

- `packages/coding-agent/src/discovery/omp-plugins.ts:275` — `const MCP_FILENAMES = [".mcp.json", "mcp.json"] as const;`
- `packages/coding-agent/src/discovery/omp-plugins.ts:293` — `async function loadMCPServers(ctx: LoadContext): Promise<LoadResult<MCPServer>> {` (thân hàm `:293-369`)
- `packages/coding-agent/src/discovery/omp-plugins.ts:423-429` — khối `registerProvider<MCPServer>(mcpCapability.id, { id: PROVIDER_ID, displayName: DISPLAY_NAME, description: DESCRIPTION, priority: PRIORITY, load: loadMCPServers });`
- `packages/coding-agent/src/discovery/omp-plugins.ts:363` — `_source: createSourceMeta(PROVIDER_ID, mcpPath, root.level),` ← bằng chứng package đóng góp server là có thật
- `packages/coding-agent/src/discovery/agent-plugins.ts:335` ✓
- `packages/coding-agent/src/discovery/claude-plugins.ts:737` ✓
- `grep -rn 'registerProvider<MCPServer>\|registerProvider(mcpCapability' packages/coding-agent/src/discovery/ | wc -l` → **12** ✓ khớp spec

**Tài liệu phải mở đầu đúng thứ này:** việc package đóng góp theo khai báo ĐÃ CÓ trong cây; lỗ hổng là việc đóng góp theo MỆNH LỆNH lúc runtime. Tuyệt đối không viết "extensions cannot contribute MCP servers" ở bất kỳ đâu — sai, và người review biết codebase sẽ ngừng đọc.

### Bước 3 — CỔNG DỪNG: trust tier phải có câu trả lời bằng văn bản từ con người trước khi viết dòng nào

Khuyến nghị: **(b)** — cùng tier với một server user-scope, có chặn theo việc extension có đáng tin hay không; nói thẳng là thiết kế bị CHẶN bởi WI-0.

**Phát hiện mới, không có trong spec, và nó làm suy yếu lựa chọn (a):**

`packages/coding-agent/src/mcp/settings.ts:9-21` — setting `cfgMcpEnableProjectConfig` (`id: "mcp.enableProjectConfig"`) có `default: false` với doc:

```
// Off by default: a project-scope mcp.json arrives with the repository, so honouring it
// lets a cloned repo start processes and run `!command` env values. Opt in per project.
```

Nghĩa là **tier (a) — "cùng tier với một server `.mcp.json` ở tầng project" — chính là tier mà project vừa hạ xuống OFF theo mặc định** (commit `5acb674 fix(coding-agent): do not trust project-scope MCP config by default`). Một tài liệu thiết kế đề xuất (a) mà không nói câu này đang đề xuất kế thừa một tier đã bị demote có chủ ý. Phải nói thẳng trong tài liệu.

### Bước 4 — Năm sự thật về vòng đời: không cần vòng đời mới

Tất cả neo ở đây **khớp tuyệt đối** với spec, dùng nguyên văn:

```bash
grep -n 'async connectServers(\|async disconnectServer(' packages/coding-agent/src/mcp/manager.ts
#   observed: 664, 1242   ✓
```

- `packages/coding-agent/src/mcp/manager.ts:664-669` — `async connectServers(configs: Record<string, MCPServerConfig>, sources: Record<string, SourceMeta>, onStatus?, startupTimeoutMs?): Promise<MCPLoadResult> {` — public, đã tăng dần
- `packages/coding-agent/src/mcp/manager.ts:690-696` — đóng dấu source: `this.#sources.set(name, sources[name]);` rồi `existing._source = sources[name];`
- `packages/coding-agent/src/mcp/manager.ts:700-712` — bỏ qua tên đã connect (`if (this.#connections.has(name))`) hoặc đang in-flight (`#pendingConnections` / `#pendingToolLoads` / `#pendingReconnections`)
- `packages/coding-agent/src/mcp/manager.ts:1242` — `async disconnectServer(name: string): Promise<void> {`

**Quyền sở hữu — nhận luôn, không nghĩ lại.** `packages/coding-agent/src/mcp/manager.ts:937-941`:

```
 * Ownership is matched via `mcpServerName`, never a `mcp__${name}_` name
 * prefix: tool names are lossy-sanitized, so one server's sanitized name
 * can prefix another's (`atlassian` vs `atlassian:atlassian`) and a name
 * with sanitized characters never prefix-matches its own tools at all.
```

và `packages/coding-agent/src/mcp/manager.ts:942-948`:

```typescript
#replaceServerTools(name: string, tools: CustomTool<TSchema, MCPToolDetails>[]): void {
    this.#tools = this.#tools.filter(t => t.mcpServerName !== name);
```

Một kỹ sư viết phép so khớp theo tiền tố tên ở đây sẽ tái tạo một bug codebase đã ghi nhận.

### Bước 5 — Định kiểu descriptor: MCPServer TRỪ `_source`, và ba trục policy

Cũng khớp tuyệt đối:

- `packages/coding-agent/src/capability/mcp.ts:15-74` — `export interface MCPServer {` … `}` với `_source: SourceMeta;` ở `:73`
- `packages/coding-agent/src/capability/mcp.ts:36` — `	envPolicy?: "literal";`
- `packages/coding-agent/src/capability/mcp.ts:38` — `	envLiteralKeys?: string[];`
- `packages/coding-agent/src/capability/mcp.ts:50` — `	headerPolicy?: "origin-locked";` (doc `:45-49`: *"never expanded, never forwarded cross-origin"*)
- `packages/coding-agent/src/capability/mcp.ts:108-129` — `mcpCapability` với `id: "mcps"`, `key: server => server.name`, `equivalent: isSameMCPConnection`, `toExtensionId: server => \`mcp:${server.name}\``

Tài liệu phải nói descriptor bỏ `_source` (core sở hữu provenance) và phải nói nó làm gì với ba trục trên. Một server do extension đóng góp lặng lẽ thoát khỏi `headerPolicy: "origin-locked"` là một lỗ hổng chuyển tiếp credential.

### Bước 6 — Lập luận chống lại Option B: trích, đừng suy diễn

```bash
grep -n '#writableMcpSourcePath' packages/tui/src/overlays/extensions/extension-dashboard.ts
#   observed: 421, 449   ✓ khớp spec
```

`packages/tui/src/overlays/extensions/extension-dashboard.ts:449-453` — nguyên văn:

```typescript
#writableMcpSourcePath(extensionId: string): string | undefined {
    const extension = this.#state.extensions.find(ext => ext.id === extensionId && !isShadowedExtension(ext));
    if (!extension) return undefined;
    if (extension.source.provider !== "native" && extension.source.provider !== "mcp-json") return undefined;
    return extension.path;
}
```

Call site: `:396` → `#toggleMcpExtension` (định nghĩa `:418-447`) → `persistMcpToggle` tại `:421`. Đây là lập luận mạnh nhất của tài liệu và nó đã nằm sẵn trong cây: codebase **đã một lần từ chối** ghi MCP config do plugin sở hữu, trong UI, và mã hoá sự từ chối đó thành một allowlist provider.

### Bước 7 — Approval-parity với các con số thật, và phát hiện nhánh chết

```bash
grep -n 'readonly approval = ' packages/coding-agent/src/mcp/tool-bridge.ts
#   observed: 656, 771   ✓ khớp spec
```

- `packages/coding-agent/src/mcp/tool-bridge.ts:656` (trong `class MCPTool`, `:641`) — `	readonly approval = "write" as const;`
- `packages/coding-agent/src/mcp/tool-bridge.ts:771` (trong `class DeferredMCPTool`, `:760`) — `	readonly approval = "write" as const;`

Cả hai vô điều kiện, không suy ra từ config của server → một server stdio spawn subprocess và một server http POST tới host từ xa chia sẻ một tier.

Trong khi đó extension tool mặc định CHẶT HƠN — `packages/coding-agent/src/extensibility/extensions/types.ts:658-660`:
```
	/** Tool approval tier. Defaults to `"exec"` when omitted.
	 *  `"read"`: read-only operations. `"write"`: mutations. `"exec"`: code execution. */
	approval?: ToolApproval;
```

**Nhánh không với tới được** — `packages/coding-agent/src/tools/approval.ts:369-371`, nguyên văn:
```typescript
    if (tool.name.startsWith("mcp__") && tool.approval === undefined) {
        lines.push("Origin: MCP server tool");
    }
```
Vì cả hai lớp tool MCP luôn đặt `approval`, dòng này không bao giờ bắn với tool do manager mint ra. Prompt phê duyệt hôm nay không bao giờ báo cho người dùng lời gọi đến từ MCP server. Tài liệu **phải quyết** liệu server được đóng góp có làm cho nhánh này với tới được hay không.

### Bước 8 — Phụ thuộc WI-0 như tiền điều kiện kiểm chứng được

```bash
grep -rn 'isProjectTrusted: () => true' packages/coding-agent/src
#   observed: 2 hit
#   runner.ts:1293  (spec ghi :1264 — LỆCH +29)
#   session/agent-session.ts:7552  (spec ghi :7406 — LỆCH +146)
```

Hai khai báo `isProjectTrusted(): boolean;` ở `types.ts:496` và `types.ts:563` (spec ghi `:494`/`:561` — lệch +2). **Cả hai nằm trong CÙNG một interface `ExtensionContext` (`:454-564`)** — chúng là hai overload của cùng một method, không phải "hai bề mặt hướng extension" như spec mô tả.

Doc comment tại `types.ts:489-495` là bằng chứng mạnh hơn hẳn spec ghi, và nên được trích nguyên văn:
```
	 * Whether the current project/workspace is trusted. OMP performs no
	 * project-trust gating — project-level settings and extensions load
	 * unconditionally — so this always returns `true`. Exposed for
	 * compatibility with extensions authored against upstream Pi, whose
	 * `SettingsManager` accepts a `projectTrusted` flag.
```

Doc tại `types.ts:551-562` cũng vậy: *"OMP has no equivalent per-directory trust gate … already trusts project-local inputs by default"*.

**Điều kiện tiền đề, viết thành một lệnh:** `grep -rn 'isProjectTrusted: () => true' packages/coding-agent/src` phải ngừng trả về 2 hit. Khi nó còn 2 hit, mọi trust tier viết trong tài liệu đều là một no-op và tài liệu phải nói thẳng điều đó.

### Bước 9 — Câu hỏi credential: trả lời hoặc đánh dấu DEFERRED có tên

```bash
grep -n 'mcpOAuthCredentialIdsForServerUrl\|refreshManagedMcpOAuthCredential\|refreshStoredManagedMcpOAuthCredential' \
  packages/coding-agent/src/mcp/oauth-credentials.ts
```

- `:24` — `export function mcpOAuthCredentialIdsForServerUrl(serverUrl: string | undefined): string[] {`
- `:105` — `export function refreshManagedMcpOAuthCredential(`
- `:159` — `export async function refreshStoredManagedMcpOAuthCredential(`

Cả ba khớp spec tuyệt đối. Kho OAuth khoá theo URL → một extension có thể chỉ đích một URL mà người dùng đã có credential. Tài liệu hoặc loại server được đóng góp khỏi managed OAuth, hoặc nói credential resolution được namespaced theo từng extension.

### Bước 10 — Câu hỏi enable/disable: trả lời bằng code

`packages/coding-agent/src/mcp/config-writer.ts:333-379` — `export async function setMcpServerEnabled(options: SetMcpServerEnabledOptions): Promise<void> {`. Khớp spec tuyệt đối.

Doc tại `:300-305` (spec ghi `:297-306`, thực tế interface bắt đầu ở `:297`, `sourcePath?: string;` ở `:306`):
```
	 * Absolute path to the loaded row's source mcp.json. Provide ONLY for
	 * formats this codebase owns (native `.omp/mcp.json` and `mcp-json`
	 * `mcp.json`/`.mcp.json`). Tool-owned configs (opencode.json, claude.json,
	 * settings.json …) MUST be omitted; we never mutate another tool's file.
```

Nhánh disable (`:377-379`): `if (!updatedInConfig) { await setServerDisabled(userPath, name, true); }` → denylist `disabledServers` ở tầng user. Nhánh enable (`:349-366`): nếu source không ghi được thì `setServerForceEnabled(userPath, name, true)` → allowlist `enabledServers`.

Server do descriptor đóng góp rơi vào đúng nhóm đó. Tài liệu phải xác nhận đó là UX được chủ ý (công tắc tắt ở tầng từng user, sống cùng với sự hiện diện của extension), **không phải** một cờ `enabled` do extension sở hữu mà toggle người dùng không ghi đè được.

### Bước 11 — Câu hỏi level / provenance

- `packages/coding-agent/src/capability/types.ts:139-156` — `export interface SourceMeta {` với `provider`, `providerName`, `path`, `level: "user" | "project" | "native"`, `origin?`. Khớp spec tuyệt đối.
- `packages/coding-agent/src/modes/components/extensions/state-manager.ts:60-61`:
  ```typescript
  	if (source.level === "user" && !isUserSourceEnabled(source.provider)) {
  		return { state: "disabled", disabledReason: "user-opt-in" };
  ```
- `packages/coding-agent/src/extensibility/skills.ts:163-185` — `function isSourceEnabled(source: SourceMeta): boolean {` … `}`. Khớp spec tuyệt đối.

Server runtime không có file, không có provider trong danh mục. Chọn `level` nào quyết định nó rơi vào cổng `user-opt-in` ở trên hay không.

### Bước 12 — Đường loader mà một server được đóng góp phải đi qua

Spec ghi `mcp/loader.ts:92-107`. Thực tế: khối bắt đầu ở `:93`, và dòng định dạng là:

`packages/coding-agent/src/mcp/loader.ts:106` —
```typescript
		const path = serverName && providerName ? `mcp:${serverName} via ${providerName}` : `mcp:${tool.name}`;
```
với comment `:105` — `// Format: "mcp:serverName via providerName" (e.g., "mcp:agentx via Claude Code")`.

Dùng `loader.ts:106` (không phải `:92-107`) làm neo. `providerName` được suy ra từ `connection?._source?.providerName ?? source?.providerName ?? connection?._source?.provider ?? source?.provider` (`:101-102`) — nghĩa là loader **đã** đọc provenance từ `_source`; đó là lý do core phải sở hữu `_source`.

### Bước 13 — Hai dòng trỏ

1. `docs/extensions.md` — bullet `- \`mcp_notification\`` thật sự nằm ở **`:393`**, ngay dưới heading `### MCP notifications` ở **`:391`**. (Spec ghi `:392`, trỏ vào dòng trống.) Chèn một bullet một dòng ngay sau `:393`.
2. `docs/mcp-config.md` — bullet ở **`:40`**:
   ```
   - installed Claude marketplace plugins and OMP extension packages that declare MCP servers
   ```
   Hoặc danh sách thứ tự ưu tiên: heading `## Discovery and precedence` ở `:484`, câu dẫn ở `:486`, và danh sách 9 mục ở `:488-496` với `2. OMP extension packages` tại `:489`. (Spec ghi `:484-495`; danh sách thật kết thúc ở `:496`.)

Cả hai dòng dài MỘT dòng. Không mở rộng mục nào.

### Bước 14 — Mục "những gì KHÔNG quyết ở đây"

Nói thay vì gọi tên phase: thiết kế merge dưới M2; bản build chưa có chủ; phải gán tên và hạn trước khi M2 đóng lại. Bản build nên xếp sau WI-9 (wave 7).

Xác nhận nơi đặt file: `find . -maxdepth 3 -type d -iname 'adr*' -not -path './node_modules/*'` → **không trả về gì** (không có thư mục ADR). `docs/` phẳng có `blob-artifact-architecture.md`, `fs-scan-cache-architecture.md`, `natives-architecture.md`. Vậy `docs/` là nơi đúng.

---

## 4. Hợp đồng test

**Không có test dưới M2. Đó là công cụ đúng, không phải lỗ hổng.** Không có dòng source nào đổi nên không có hành vi nào để quan sát; `AGENTS.md` cấm test hình thức.

**Cấm tuyệt đối:** không viết test đọc `types.ts` và khẳng định `registerMcpServer` không tồn tại. Đó là source grep, bị `AGENTS.md` cấm, và nó biến việc merge tài liệu thành một test fail vào đúng ngày bản build xuống đất.

**Phải viết trong tài liệu, ngay bây giờ**, làm acceptance contract cho bản build tương lai:

| test file (tương lai) | case | người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| `packages/coding-agent/test/extensibility/mcp-contribution.test.ts` | tool của một MCP server do extension đóng góp phải resolve approval **BẰNG** approval resolve được cho một server cùng tên đóng góp bởi `.mcp.json` | Người dùng bị hỏi approve ở một tier khác với server cùng tên mà họ đã cấu hình bằng file — phân biệt đường đi dựa trên ai đóng góp, không dựa trên server. **Không assert literal `"write"`** — một literal sẽ vẫn pass vào ngày ai đó đổi tier cho tất cả và sẽ không chứng minh gì về parity. |
| cùng file | mint tên: `mcp__<server>_<tool>`, `mcpServerName` khớp, `loader.ts:106` sinh `mcp:<server> via <providerName>` | Danh sách tool hiển thị một dòng `mcp:foo via <provider>` sai, hoặc teardown gỡ tool của server khác. |
| cùng file | quyết định về nhánh `tools/approval.ts:369-371` | Nếu thiết kế nói nhánh phải với tới được và nó không, người dùng approve một tool mà không thấy dòng "Origin: MCP server tool" — họ không biết mình vừa duyệt cái gì. |

---

## 5. Cổng

### Chạy được

```bash
cd /Users/tranquangdang21/Projects/ultraworkers

# 1. Cổng cơ khế mạnh nhất — nhưng XEM MỐI 6, cổng này ĐANG ĐỎ SẴN
git status --porcelain -- docs packages

# 2. Xác nhận 12 provider (đã kiểm: 12 ✓)
grep -rn 'registerProvider<MCPServer>\|registerProvider(mcpCapability' packages/coding-agent/src/discovery/ | wc -l

# 3. Xác nhận trust stub vẫn còn 2 hit (đã kiểm: 2 ✓)
grep -rn 'isProjectTrusted: () => true' packages/coding-agent/src

# 4. Xác nhận không có method đóng góp MCP (đã kiểm: exit 1, 0 hit ✓)
grep -n 'registerMcp\|registerMcpServer\|McpServer' packages/coding-agent/src/extensibility/extensions/types.ts

# 5. Bắt sửa ngoài ý muốn — KHÔNG phải bằng chứng thiết kế đúng
bun run check:ts

# 6. Không dùng `tsc` / `npx tsc` — tuyệt đối
```

### Cổng này có ĐỎ ĐƯỢC không, và bằng cách nào

**Điều khoản (b) — ĐỎ ĐƯỢC, cơ khế, nhưng ĐANG ĐỎ SẴN.** Chạm bất kỳ file nào dưới `packages/` là `git status --porcelain -- docs packages` hiện ngay. **Nhưng:** ngay lúc này lệnh đó đã trả về `?? packages/coding-agent/test/collab/web-wire.types.ts` — một file untracked có sẵn từ trước, không liên quan tới WI-12. Kỹ sư sẽ thấy một dòng `packages/` và có thể tưởng mình đã phá cổng. **Phải chụp baseline trước khi sửa** và so sánh, đừng so với "phải rỗng".

**Điều khoản (c) — ĐỎ ĐƯỢC.** Đây là phép kiểm thật, vì chính văn bản của spec chứa lỗi đó: `MILESTONE_2_EXECUTION_PLAN.md:4356` và `:4559` vẫn còn câu "extensions KHÔNG thể đóng góp MCP server", trong khi `omp-plugins.ts:423` + `agent-plugins.ts:335` + `claude-plugins.ts:737` nói ngược lại. Tài liệu lặp lại sự nói quá đó là đỏ. Cũng đỏ nếu tài liệu không nói rõ **tier (a) đã bị demote** (`mcp/settings.ts:14`, `default: false`).

**Điều khoản (d) — KHÔNG ĐỎ ĐƯỢC bằng máy.** Không có lệnh nào phát hiện một trust tier chưa được trả lời. Đây là một lượt đọc của con người, có tên và thời điểm. Nếu WI-12 cần tên người trả lời trước khi viết, đó là việc phải đi xin, không phải việc kiểm.

**Điều khoản (e) — KHÔNG ĐỎ ĐƯỢC bằng máy.** "Người review khác trả lời được câu 'nếu tôi cài một extension đăng ký MCP server, mạng và credential của tôi ra sao' mà không cần đọc code" là một buổi review thiết kế.

**Cổng KHÔNG bắt được, và không nên giả vờ ngược lại:**
- Không phát hiện được một thiết kế **nêu đúng tên một trust tier nhưng mô tả sai** tier đó.
- Không phát hiện được việc thiết kế bị lặng lẽ biến thành **kế hoạch build** khi người đọc sau lướt qua mục "không quyết ở đây".
- Không phát hiện được việc một maintainer trả lời trust tier bằng văn bản rồi không ghi tên/mốc thời gian.

**Cân bằng cơ khế duy nhất là (b)** — bắt lỗi phổ biến nhất: ai đó "cứ thêm cái method thôi" vì tài liệu thiết kế làm nó trông dễ. Một cổng luôn xanh tệ hơn không có cổng, nên nếu phải chọn, giữ (b) và (c) và nói thẳng (d)/(e) là của con người.

**Cổng bổ sung nên thêm — đỏ được và bắt đúng lỗi của lần chạy này:** lưu lại số dòng thật của 5 neo `types.ts` trong tài liệu, rồi kiểm bằng `grep -n 'export interface ExtensionAPI' packages/coding-agent/src/extensibility/extensions/types.ts` khớp con số đã ghi. Nếu không, tài liệu mang neo cũ đi vào M3.

---

## 6. Cạm bẫy riêng của work item này

### 6.1 — Bẫy lớn nhất: đính chính "+25" của chính spec đã thành neo hỏng

`MILESTONE_2_EXECUTION_PLAN.md:4371` và `:4561` nói độ trôi `types.ts` là **+25 đồng nhất**. Tại `65cc6c1` nó **không còn đồng nhất**:

| vùng | trôi thật |
| --- | --- |
| `ToolDefinition` (`:658`, `:663`, `:665`, `:672`) | **+2** |
| `McpNotificationEvent` / event map (`:904`, `:1149`) | **+20 / +21** |
| `ExtensionAPI` register block (`:1256`, `:1340`, `:1347`…) | **+21 / +25** |

Kỹ sư tin "đồng nhất +25" sẽ cộng 25 vào `types.ts:663` và rơi vào `:688` — không có gì ở đó. **Dùng cột "thật" ở mục 3 Bước 1, đừng dùng phép cộng.**

### 6.2 — Cổng GATE 1 trong spec sẽ đỏ, và đỏ theo cách gây hại

Lệnh xác minh đầu tiên của spec (`MILESTONE_2_EXECUTION_PLAN.md:4492`) có `expected: 663, 665, 904, 1256, 1340`. Chạy hôm nay ra `665, 667, 924, 1277, 1365`. Nguy hiểm không phải là cổng đỏ — mà là một kỹ sư tưởng code bị lệch và "sửa cho khớp". Số dòng không phải hợp đồng. **Cập nhật expected, không sửa code.**

### 6.3 — `docs/extensions.md:392` trỏ vào một dòng trống

Bullet `mcp_notification` thật ở **`:393`**; `:392` là dòng trống giữa heading `:391` và bullet. Chèn vào `:392` sẽ tách bullet khỏi heading nó.

### 6.4 — Tiền đề nguy hiểm nhất về mặt nội dung

Plan (`MILESTONE_2_EXECUTION_PLAN.md:4356`) và cả bảng đính chính (`:4559`) đều dùng cụm "không thể đóng góp MCP server" như một **sự thật**. Nó chỉ đúng cho **module đã nạp, lúc runtime**. Một extension **package** đã đóng góp server từ lâu qua `.mcp.json` / `mcp.json` — 12 provider đăng ký capability `mcps`, `omp-plugins.ts:423` là bằng chứng trực tiếp. Tài liệu lặp lại cụm đó sẽ khiến một maintainer đóng tài liệu lại ở dòng ba.

### 6.5 — `isProjectTrusted` không phải "hai bề mặt", và bằng chứng mạnh hơn spec ghi

Hai khai báo (`:496`, `:563`) là **hai overload trong cùng interface `ExtensionContext` (`:454-564`)**, không phải hai interface. Và doc comment tại `:489-495` / `:551-562` nói thẳng hơn spec nhiều: *"OMP performs no project-trust gating — project-level settings and extensions load unconditionally"*. Trích nguyên văn doc, đừng chỉ nói "check không bao giờ fail".

### 6.6 — Trust tier (a) đã bị chính project demote

`mcp/settings.ts:9-21`: `cfgMcpEnableProjectConfig` có `default: false`, doc nói rõ project-scope `mcp.json` *"lets a cloned repo start processes and run `!command` env values"*. Đề xuất (a) = "cùng tier với `.mcp.json` tầng project" tức là đề xuất kế thừa một tier **đang tắt theo mặc định**. Spec không hề nhắc tới điều này. Đây là lập luận mạnh nhất để bác (a) — mạnh hơn cả lập luận về bán kính ảnh hưởng.

### 6.7 — Tên "approval parity" đọc ngược

Spec nói approval-parity, nhưng thực tế: MCP tool bị chặn ở `write` (`tool-bridge.ts:656`, `:771`, hardcode), extension tool mặc định bị chặn ở `exec` (`types.ts:658-660`). Extension tool **chặt hơn**. Tài liệu phải nói thẳng cách đọc này ngược, nếu không bản build sẽ "parity" theo một hướng và hậu quả là mở rộng bán kính phê duyệt.

### 6.8 — Bẫy "an toàn giả": cổng xanh không nói gì

`bun run check:ts` sẽ xanh vì không có dòng source nào đổi. Nó **không** chứng minh thiết kế đúng. Đừng ghi "CI xanh" vào PR description như bằng chứng cho item này.

### 6.9 — Đường cạm bẫy âm thầm: file untracked có sẵn dưới `packages/`

`packages/coding-agent/test/collab/web-wire.types.ts` đang untracked ngay lúc này. Cổng (b) vì vậy **không bao giờ hiện "rỗng"** ở nhánh này. Chụp baseline trước, so sánh sau. Đừng xoá file của người khác để làm cổng xanh.

### 6.10 — Cạm bẫy về hình thức: đừng viết tài liệu như checklist

Spec nói đúng: một tài liệu thiết kế đọc ra như danh sách việc sẽ bị nhầm là kế hoạch build và ai đó sẽ xếp lịch cho nó — mà bản build này **không có chủ sở hữu** (§8.2 của plan). Văn xuôi, có tiêu đề điều kiện, không có ô tick.

---

## 7. Bảng neo đã kiểm — tổng kết

**81 neo đã kiểm. 58 khớp tuyệt đối. 23 hỏng (18 trong `types.ts`, và 5 nằm rải ở `runner.ts`, `agent-session.ts`, `docs/extensions.md`, `docs/mcp-config.md`, `mcp/loader.ts`; cộng HEAD).**

| nhóm | khớp | hỏng |
| --- | --- | --- |
| `mcp/manager.ts` (664, 690-696, 700-712, 937-941, 942-948, 1242, len 1941) | 7 | 0 |
| `capability/mcp.ts` (15-74, 36, 38, 50, 108-129) | 5 | 0 |
| `modes/components/extensions/dashboard-runtime.ts` (7, 8, 22, 40-48, 49-62, len 80) | 6 | 0 |
| `tui/.../extension-dashboard.ts` (396, 418, 421, 447, 449, 449-453) | 6 | 0 |
| `mcp/tool-bridge.ts` (656, 771) | 2 | 0 |
| `tools/approval.ts` (369-371) | 1 | 0 |
| `discovery/*` (omp 275/293/293-369/363/423/423-429, agent 335, claude 737, count 12) | 9 | 0 |
| `mcp/oauth-credentials.ts` (24, 105, 159) | 3 | 0 |
| `mcp/config-writer.ts` (297, 300-305, 306, 333, 333-379) | 5 | 0 |
| `mcp/types.ts` (145), `mcp/config.ts` (103), `capability/types.ts` (139-156) | 3 | 0 |
| `state-manager.ts` (60-61), `skills.ts` (163-185), `custom-tools/types.ts` (213-214, 221), `mcp/settings.ts` (5 register) | 5 | 0 |
| grep phủ định `registerMcp` trong `types.ts` (0 hit) | 1 | 0 |
| không có thư mục ADR; `docs/` có 3 file `*-architecture.md` | 2 | 0 |
| **`extensibility/extensions/types.ts`** | **2** (file tồn tại; `isProjectTrusted` xuất hiện đúng 2 hit ✓) | **18** |
| **`extensibility/extensions/runner.ts`** (1264) | 0 | **1** (thật 1293) |
| **`session/agent-session.ts`** (7406) | 0 | **1** (thật 7552) |
| **`docs/extensions.md`** (392) | 0 | **1** (bullet thật 393, heading 391) |
| **`docs/mcp-config.md`** (484-495) | 1 (`:40`) | **1** (danh sách thật 488-496) |
| **`mcp/loader.ts`** (92-107) | 0 | **1** (dòng định dạng thật 106) |
| **HEAD** (808b365) | 0 | **1** (thật 65cc6c1) |

### Các câu hỏi còn mở, phải mang tới buổi quyết định

1. **TRUST TIER (chặn bắt đầu)** — (a) auto-connect như `.mcp.json` project / (b) như user-scope có chặn theo độ tin cậy extension / (c) grant rõ ràng từng server. Xem 6.6: (a) đã bị demote.
2. **Credential** — server được đóng góp có bị loại khỏi managed OAuth không, hay credential resolution được namespaced theo từng extension?
3. **Level + provenance** — `level` nào, provider id nào, path giả hay rỗng? Nó đi thẳng vào `state-manager.ts:60`.
4. **Enable/disable** — xác nhận UX là công tắc tắt ở tầng user, không phải cờ `enabled` do extension sở hữu.
5. **Approval** — server được đóng góp nhận tier riêng không, và `tools/approval.ts:369-371` có trở nên với tới được không?
6. **Khai báo lúc nạp hay muộn** — khuyến nghị chỉ-lúc-nạp; khai-báo-muộn là một event mới trên manager.
7. **Bề mặt ghi canonical** — YES / NO / DEFERRED, đối chiếu WI-10. Tài liệu này không được âm thầm trở thành câu trả lời.
