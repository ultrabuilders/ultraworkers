# PHIẾU TRIỂN KHAI — `## WI-0. ADR trust model`

Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md` §`## WI-0` (dòng 367–470).
HEAD đo được: `65cc6c1` (`test(coding-agent): opt in explicitly where the suite is about parsing`), 2026-09-29.

> Phiếu này KHÔNG sửa kế hoạch. Ở chỗ nào kế hoạch sai so với cây thật, phiếu ghi ra và đưa đường đi đúng.
>
> **Đây là mục quyết định, không code.** Không có dòng `.ts` nào được chạm. Toàn bộ sản phẩm là ba file văn bản.

---

## 0. Tóm tắt kiểm neo — ĐỌC MỤC NÀY TRƯỚC

Tôi đã mở và đọc **22 neo**. **11 neo đúng, 11 neo hỏng.** Đáng chú ý nhất:

1. **Cả ba neo trong bảng "File cần chạm tới" mà kế hoạch đánh dấu `verified: true` — thì hai hỏng, một đúng một nửa.** Cột "đã kiểm chứng?" của bảng đó không đáng tin.
2. **Cảnh báo môi trường ở mục Xác minh SAI.** Kế hoạch nói addon native không tồn tại và hai file test "hiện không chạy được". Tôi đã chạy: addon **có tồn tại** và **3 pass / 0 fail**.
3. **Hai trong năm lệnh grep cổng hoá hoạt động đúng; một lệnh trong đó đỏ nhầm** trên một bảng 4 cột hoàn toàn đúng.

Bảng neo đầy đủ ở §7.

---

## 1. Cái gì thay đổi, quan sát được

Repo có `docs/extension-trust-model.md` — một ADR ghi ra bằng văn bản thế bài tin cậy mà `isProjectTrusted(): () => true` và `scope: "project"` trong `discovery/helpers.ts` đã giao hàng một cách vô hình — và một maintainer đọc **một** file đó trả lời được ba câu hỏi (project extension tải vô điều kiện hay bị chặn; `ctx.exec` bị chặn riêng hay cố ý ngoài; `isProjectTrusted()` thành giá trị thật hay ở lại làm stub) mà không phải hỏi tác giả.

---

## 2. Bảng điểm sửa

"TRƯỚC" trích nguyên văn từ file tôi vừa mở; "SAU" là hình dạng sau khi sửa.

### 2.1 `docs/extension-trust-model.md` — TẠO MỚI (chưa tồn tại, đã xác nhận bằng `ls`)

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `docs/extension-trust-model.md` | toàn file | **không tồn tại** (`lsd: docs/extension-trust-model.md: No such file or directory`) | ADR, đúng 8 mục bắt buộc theo thứ tự kế hoạch dòng 381 |

### 2.2 `docs/extensions.md` — SỬA (912 dòng, **không có** mục Trust nào)

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `docs/extensions.md:896` | `## Constraints and pitfalls` | `## Constraints and pitfalls` | giữ nguyên; mục **`## Trust`** chèn ngay TRƯỚC nó, 3–4 câu, link `docs/extension-trust-model.md` |
| `docs/extensions.md` (toàn file) | `isProjectTrusted` | `rg -n -i "^#+ .*trust\|isProjectTrusted" docs/extensions.md` → **không có kết quả nào** | mục Trust mới là nơi đầu tiên trong file nói về thế bài |

Hàng tiêu đề hiện có của `docs/extensions.md` (đã đọc, để tác giả biết chèn ở đâu):
`17:## What an extension is` · `38:## Runtime model` · `67:## Quick start` · `109:## Extension API surfaces` · `219:## 2) Handler context` · `309:## 3) Command context` · `896:## Constraints and pitfalls` · `904:## Extensions vs hooks vs custom-tools`.

**Cạm bẫy vị trí:** `## Trust` không được chèn ngay sau `## 3) Command context` (dòng 309) dù `isProjectTrusted` là method của context — tác giả extension đọc `docs/extensions.md` theo dòng tìm kiếm, và "Trust" là câu hỏi về **chính sách**, không phải về **API shape**. Cùng một file có `## Tool authoring details` (421) và `## UI integration points` (655) — chèn giữa chúng sẽ đứt dòng chảy của người đang học viết tool.

### 2.3 `packages/coding-agent/CHANGELOG.md` — SỬA

| đường/dẫn | symbol | TRƯỚC (nguyên văn) | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/CHANGELOG.md:3` | `## [Unreleased]` | `## [Unreleased]` | giữ nguyên |
| `packages/coding-agent/CHANGELOG.md:5` | mục con đầu tiên của Unreleased | `### Security` | **đã có sẵn** — mục `### Added` MỚI chèn SAU khối `### Security`, không phải "ngay dưới `[Unreleased]`" |
| `packages/coding-agent/CHANGELOG.md:7` | | `- Project-scope MCP config (\`mcp.json\`, \`.mcp.json\`, \`.omp/mcp.json\`) is no longer loaded by default. Because these files travel inside a repository, honouring them let a cloned project start arbitrary processes through a stdio server's \`command\`, and run \`!command\` env and header values through the shell. Set Settings → Tools → Discovery & MCP → MCP Project Config to re-enable it per project.` | giữ nguyên — bất biến |
| `packages/coding-agent/CHANGELOG.md:1117` | mục #7955 **ĐÃ PHÁT HÀNH** | `- Fixed legacy Pi extensions failing to load when calling \`ctx.isProjectTrusted()\` in an event handler; the extension context now exposes it (always \`true\`, since OMP applies no project-trust gating) ([#7955](https://github.com/can1357/oh-my-pi/issues/7955)).` | **TUYỆT ĐỐI KHÔNG CHẠM** — thuộc `### Fixed` dưới `## [18.1.16] - 2026-09-09` (dòng 1099) |

Dòng changelog mới (một dòng, theo AGENTS.md):

```
- Documented the extension trust model: project-local extensions load unconditionally and `isProjectTrusted()` is a deliberate compatibility stub returning `true` ([#NNNN](https://github.com/can1357/oh-my-pi/issues/NNNN)).
```

**Đây không phải `Added` về mặt kỹ thuật** — mục tài liệu, không phải symbol mới — nhưng kế hoạch dòng 383 chốt `### Added`, và `### Added` là mục đúng theo AGENTS.md cho "bây giờ người đọc làm được gì". Giữ `### Added`.

---

## 3. Các bước, đánh số, mỗi bước có neo đã kiểm

Mọi neo dưới đây tôi đã `sed -n "<n>p"` và đọc. Số dòng là số **thật ở HEAD `65cc6c1`**, không phải số trong kế hoạch.

### Bước 1 — Chốt "What ships today": năm câu, mỗi câu một neo

Năm sự thật, mỗi sự thật một neo **đã kiểm**:

| # | Sự thật | Neo đã kiểm | Nội dung dòng đó |
| --- | --- | --- | --- |
| a | Input phạm vi project được phát hiện và tải vô điều kiện | `packages/coding-agent/src/discovery/omp-extension-roots.ts:162` | `	project: path.join(ctx.cwd, ".omp"),` |
| b | Root project của đường **plugin** KHÔNG phải `<cwd>/.omp` mà là `entry.installPath` | `packages/coding-agent/src/discovery/helpers.ts:1300` | `							scope: "project",` (bên trong `projectRoots.push` mở ở 1294) |
| c | `isProjectTrusted()` tồn tại ở **hai** chỗ khai báo | `packages/coding-agent/src/extensibility/extensions/types.ts:496` và `:563` | `	isProjectTrusted(): boolean;` (giống hệt nhau, chỉ khác jsdoc) |
| d | Cả hai hiện thực là đúng chuỗi `() => true` | `packages/coding-agent/src/extensibility/extensions/runner.ts:1293` và `packages/coding-agent/src/session/agent-session.ts:7552` | `			isProjectTrusted: () => true,` |
| e | Không có prompt, allowlist hay cổng chặn nào trên đường tải | `packages/coding-agent/src/discovery/helpers.ts:1311` | `	// Project entries shadow user entries for the same plugin ID.` — và `rg -i "trust.*prompt\|allowlist\|trusted"` trên `src/discovery/` + `src/extensibility/` chỉ trả về allowlist của MCP tool và allowlist tiền tố byte, **không cái nào là trust gate** |

**Riêng (b) là mảnh nghiên cứu quan trọng nhất của cả ADR**, và nó đã được xác nhận độc lập:

- `helpers.ts:1271-1307` — khối `// ── Project-scoped OMP registry ──`, jsdoc `// Loaded from the nearest .omp/plugins/installed_plugins.json relative to cwd.` / `// Project entries take precedence over user entries for the same plugin ID.` Đúng như kế hoạch mô tả, **cả ba dòng đều nguyên văn**.
- `helpers.ts:1311-1317` — cơ chế che khuất: `roots.push(...projectRoots, ...deduped)` sau khi `roots.filter(r => !projectIds.has(r.id))`. Comment tại 1311 nói thẳng: `// Project entries shadow user entries for the same plugin ID.`
- `packages/coding-agent/src/extensibility/plugins/loader.ts:19` — `	scope: "user" | "project";`
- `loader.ts:95` — `	const nodeModulesPath = path.join(root, "node_modules");`
- `loader.ts:331` — `function resolvePluginPaths(plugin: InstalledPlugin, key: "tools" | "hooks" | "commands" | "extensions"): string[] {`
- `loader.ts:407` — `	return resolvePluginPaths(plugin, "extensions");`
- `helpers.ts:1025` — `export async function resolveActiveProjectRegistryPath(cwd: string): Promise<string | null> {`, jsdoc 1013–1023 mô tả walk order: `.omp/` gần nhất → fallback `.git` gần nhất → `null`.
- **Đường này ĐANG CHẠY, không phải code chết:** `resolveActiveProjectRegistryPath` được gọi từ `modes/acp/acp-agent.ts:2165`, `modes/rpc/rpc-mode.ts:1103`, `modes/controllers/selector-controller.ts:306` và `:990`, `main.ts:2132`, `slash-commands/builtin-marketplace.ts:31`.

Câu kết luận (viết thẳng vào ADR, **đừng làm yếu**):

> Clone một repository có chứa `.omp/plugins/installed_plugins.json` khiến module extension của các plugin trong đó tải như các root phạm vi project, không có prompt, và các entry project **che khuất** entry của chính người dùng cho cùng một plugin ID.

### Bước 2 — `ctx.exec` nằm ở đâu

`packages/coding-agent/src/extensibility/extensions/types.ts:1516-1517`:

```ts
	/** Execute a shell command. */
	exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
```

Kiện khai được ở `types.ts:77` (`import type { ExecOptions, ExecResult } from "../../exec/exec";`) và re-export ở `types.ts:139`.

**Câu trả lời M2-OQ5 bắt buộc phải có, và câu này không được suy ra:**

Nguồn tham chiếu để chốt: `/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/docs/security.md:33` (đã đọc) —

> Project trust does not limit what tool calls can access or affect. After Pi starts, enabled tools still use the operating-system permissions of the Pi process.

Đó **chính là câu trả lời** mà upstream đã công bố: trust gate chặn **tải**, không chặn **hành động sau khi đã tải**. Nếu ADR chọn A hoặc B, câu này là câu trả lời mặc định và phải viết ra tường minh.

### Bước 3 — Ba phương án, chi phí thật

**A — Prompt theo thư mục.** Rẻ nhất về code, **nhưng không miễn phí**:
- Hai chỗ hiện thực phải đổi: `runner.ts:1293`, `agent-session.ts:7552`.
- Hai test chuyển đỏ (xem §4).
- Mâu thuẫn với mục changelog **đã phát hành** tại `CHANGELOG.md:1117`.
- **Bán kính rộng hơn module extension:** jsdoc tại `types.ts:550-562` nói project trust bao trùm `extensions, settings, skills, resources`. A hoặc chặn rộng hơn phạm vi ADR này quyết, hoặc tự mâu thuẫn.

**B — Allowlist theo tầng nguồn gốc.** Friction bằng không lúc tải, nhưng đòi hỏi một entry ở user scope tường minh — tức ma sát đẩy sang chỗ khác, và người dùng không biết mình đang ở tầng nào khi clone.

**C — Trì hoãn có tuyên bố.** Chỉ hợp lệ nếu ngay dòng sau là tuyên bố "M2 khẳng định và không khẳng định gì".

### Bước 4 — Quyết định: đúng MỘT trong ba chữ

Viết một dòng có hình dạng **bắt buộc** để cổng ở §5 grep được:

```markdown
**Decision: Option A**
```

Một dòng, một chữ, đúng regex. Xem §5 vì sao hình dạng này là điều kiện để cổng đỏ được.

### Bước 5 — Bảng hạng mục thực thi: bảng **3 cột**

```markdown
| Item | OWNER | DATE |
| --- | --- | --- |
| Enforcement: project-plugin trust gate | @handle | 2027-01-15 |
```

Ba cột, `OWNER` ở ô thứ hai, `DATE` ở ô thứ ba, **cả hai ô hằng đều có giá trị**. Tôi đã thử bốn cột — cổng của kế hoạch đỏ nhầm. Xem cạm bẫy P2.

### Bước 6 — Ba câu trả lời, dạng khẳng định

1. Extension phạm vi project: **tải vô điều kiện** — neo `omp-extension-roots.ts:162` + `helpers.ts:1271-1307`.
2. `ctx.exec`: **trong** cổng chặn / **cố ý ngoài** — một câu, phải grep được (xem §5 cổng 4).
3. `isProjectTrusted()`: **stub tương thích trả `true`, CỐ Ý ĐÃ ĐƯỢC TÀI LIỆU HÓA** — neo `runner.ts:1293` + `agent-session.ts:7552`.

### Bước 7 — Hệ quả + ghi vào `docs/extensions.md` + changelog

Không commit nếu không được yêu cầu.

---

## 4. Hợp đồng test

**Không viết test nào.** Đây là quyết định dạng văn bản; AGENTS.md cấm test hình thức, và một tài liệu không có hợp đồng runtime quan sát được.

Hợp đồng là: **một maintainer không phải tác giả** mở `docs/extension-trust-model.md` và trả lời được ba câu ở §3 bước 6.

### Hai file test có sẵn — và kế hoạch SAI về trạng thái của chúng

Kế hoạch nói (dòng 417): *"Hiện không chạy được (xem mục Xác minh)"*, và mục Xác minh nói addon `packages/natives/native/pi_natives.darwin-arm64.node` không tồn tại.

**Tôi đã kiểm. Cả hai đều sai:**

```
$ ls -la packages/natives/native/pi_natives.darwin-arm64.node
-rw-r--r-- ... 152351205 Sep 29 07:32   ← TỒN TẠI

$ cd packages/coding-agent && bun test test/extension-context-project-trust.test.ts test/issue-7955-extension-project-trusted.test.ts
bun test v1.3.14 (0d9b296a)
 3 pass
 0 fail
 4 expect() calls
Ran 3 tests across 2 files. [332.00ms]
```

Cả ba assertion đều **xanh**:
- `test/extension-context-project-trust.test.ts:14` — `expect(runner.createContext().isProjectTrusted()).toBe(true);`
- `test/issue-7955-extension-project-trusted.test.ts:18-19` — `expect(typeof ctx.isProjectTrusted).toBe("function");` + `expect(ctx.isProjectTrusted()).toBe(true);`
- `test/issue-7955-extension-project-trusted.test.ts:24` — `expect(ctx.isProjectTrusted()).toBe(true);` (command context kế thừa; xác nhận ở `runner.ts:1379-1381` — `createCommandContext()` trả `{ ...this.createContext(), ... }`)

**Hệ quả cho PR:** câu "không được mô tả là đã xanh ở bất kỳ đâu" của kế hoạch **không còn có cơ sở**. Viết thẳng "3 pass / 0 fail tại HEAD `65cc6c1`" là nói thật và mạnh hơn. Nhưng **đừng sửa hai file test** — chúng vẫn là hợp đồng-by-observation, và chúng sẽ chuyển đỏ **chỉ khi** câu trả lời thứ ba là "giá trị thật".

**Người dùng thấy gì nếu hồi quy:** thế bài tin cậy vẫn cứ do ai đó tình cờ viết API extension trước quyết định, một cách vô hình, cho tới khi thế bài buộc phải đổi — lúc đó nó là breaking change với mọi tác giả extension bên thứ ba đã xuất bản dựa trên seam đó, và không có tài liệu nào giải thích họ dựa vào điều gì.

---

## 5. Cổng

### 5.1 Trả lời thẳng: cổng này CÓ ĐỎ ĐƯỢC không?

**Có — nhưng chỉ 4 trong 7 điều kiện dưới đây.** Ba điều kiện còn lại tôi nói thẳng là không thể đỏ bằng máy, và tôi **không** viết lại chúng thành grep giả.

Cổng gốc của kế hoạch có **một lệnh hỏng**: lệnh grep OWNER/DATE đầu tiên là regex **theo vị trí**, không phải "cùng một hàng", nên nó **đỏ nhầm** trên một bảng 4 cột hoàn toàn đúng. Chi tiết ở cạm bẫy P2.

### 5.2 Bảy cổng, phân loại rõ

| # | Điều kiện | Lệnh | ĐỎ ĐƯỢC? |
| --- | --- | --- | --- |
| G1 | ADR tồn tại, có `Status` + `Decider` + `Date` | `test -f …` + `grep -nE '^\*\*(Status\|Decider\|Date)\*\*:'` | ✅ **CÓ** |
| G2 | Quyết định là đúng MỘT trong A/B/C | `grep -cE '^\*\*Decision: Option [ABC]\*\*$'` | ✅ **CÓ** (nhờ hình dạng bắt buộc ở bước 4) |
| G3 | Câu trả lời `ctx.exec` hiện diện | grep của kế hoạch | ✅ **CÓ** — tôi đã thử cả hai chiều |
| G4 | Bảng enforcement có hàng dữ liệu | grep lệnh 2 của kế hoạch | ✅ **CÓ** — tôi đã thử cả hai chiều |
| G5 | OWNER **và** DATE cùng một hàng | **viết lại** — xem 5.4 | ✅ **CÓ** sau khi viết lại |
| G6 | Đúng ba file, không file `.ts` | `git add -N … && git diff --stat` | ✅ **CÓ** |
| G7 | Một maintainer **khác** trả lời được ba câu | — | ❌ **KHÔNG** |

**G7 không thể đỏ được, và tôi không sẽ bịa ra cách.** Nó là một hành vi của con người. Cách duy nhất để nó "đỏ" là **thuê một người khác đọc và hỏi**. Đây là điều kiện duy nhất thực sự bắt được tài liệu tốt, và cũng là điều kiện duy nhất phải tốn người.

### 5.3 Các lệnh — bản dùng được

```bash
# G0 — file tồn tại và mang Status/Decider/Date
test -f docs/extension-trust-model.md || { echo "RED: thiếu ADR"; exit 1; }
grep -nE '^\*\*(Status|Decider|Date)\*\*:' docs/extension-trust-model.md \
  || { echo "RED: thiếu Status/Decider/Date"; exit 1; }

# G1 — quyết định đúng MỘT trong ba chữ A/B/C
grep -cE '^\*\*Decision: Option [ABC]\*\*$' docs/extension-trust-model.md   # phải == 1

# G2 — câu trả lời M2-OQ5 về ctx.exec
# KHÔNG dùng  grep 'ctx.exec\|ExecOptions'  — chữ ký options?: ExecOptions luôn khớp
# (tôi đã thử: file có chữ ký mà KHÔNG có câu trả lời vẫn xanh với lệnh cũ)
grep -nE 'ctx\.exec.{0,40}(nằm (trong|ngoài)|cố ý|gate|cổng chặn)|(Trong|Ngoài).{0,40}cổng chặn' \
  docs/extension-trust-model.md || { echo "RED: M2-OQ5 bị bỏ ngang"; exit 1; }

# G3 — bảng enforcement: hàng tiêu đề mang OWNER và DATE
grep -nE '^\|[[:space:]]*[^|]*\|[[:space:]]*[^|[:space:]][^|]*(OWNER|CHỦ)[^|]*\|[[:space:]]*[^|[:space:]][^|]*(DATE|NGÀY)' \
  docs/extension-trust-model.md || { echo "RED: bảng thiếu cột OWNER/DATE"; exit 1; }

# G4 — và có ít nhất một hàng dữ liệu sau khi lọc hàng tiêu đề và hàng kẻ ngang
grep -nE '^\|[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*[^|[:space:]][^|]*\|[[:space:]]*[^|[:space:]]' \
  docs/extension-trust-model.md | grep -vE 'OWNER|CHỦ|DATE|NGÀY|---' \
  || { echo "RED: hạng mục thực thi chưa có OWNER/DATE"; exit 1; }

# G5 — đúng ba file, không file .ts nào
git add -N docs/extension-trust-model.md
git diff --name-only | tee /tmp/wi0-files
test "$(wc -l < /tmp/wi0-files)" -eq 3
! grep -qE '\.ts$' /tmp/wi0-files

# G6 — dòng 1117 (mục #7955 đã phát hành) bất biến
git diff packages/coding-agent/CHANGELOG.md
```

### 5.4 Vì sao G5 phải viết lại — kèm bằng chứng

Lệnh gốc của kế hoạch:

```
grep -nE '^[[:space:]]*\|[^|]*\|[[:space:]]*[^|]*(OWNER|CHỦ|DECIDER)[^|]*\|[[:space:]]*[^|]*(DATE|NGÀY)' …
```

Nó **không** kiểm "OWNER và DATE cùng một hàng" như kế hoạch mô tả. Nó kiểm **OWNER nằm ở ô thứ hai và DATE ở ô thứ ba** — vì `[^|]*` bị chặn bởi `|`, nên mẫu buộc hai nhãn phải **liền nhau**. Tôi đã chạy cả hai hình dạng:

```
| Item | OWNER | DATE |          → GREEN  (3 cột, đúng hình dạng lệnh)
| Item | Description | OWNER | DATE |  → RED    (4 cột, BẢNG ĐÚNG, CỔNG ĐỎ NHẦM)
```

Đây là loại cổng nguy hiểm hơn cổng luôn xanh: nó dạy tác giả **bóp bảng cho vừa regex** thay vì **điền OWNER**. Tôi đã thay nó bằng G3 ở 5.3: vẫn bám nhãn cột, nhưng `[^|[:space:]][^|]*` cho phép có cột mô tả ở giữa, và chỉ yêu cầu OWNER rồi DATE là hai ô **liền kề tính từ sau** — chấp nhận được cho mọi bảng có cột nhãn.

### 5.5 `git add -N` — lỗi, không phải xanh

```
$ git add -N docs/extension-trust-model.md
fatal: pathspec 'docs/extension-trust-model.md' did not match any files
```

Trước khi ADR tồn tại, lệnh **báo lỗi và dừng**, chứ không xanh. Sau khi file tồn tại thì chạy bình thường. Đây là hành vi đúng — nhưng đừng dán output `fatal:` vào PR và gọi đó là cổng đỏ; cổng chỉ có nghĩa sau khi file có mặt.

### 5.6 Cổng KHÔNG có, và không nên thêm

`bun run check:ts` — kế hoạch đã cấm đúng. Không có gì trong cây đổi hành vi, nên nó **không chứng minh được điều gì** về WI-0. Trình nó là bằng chứng là biến một mục quyết định thành mục trông như đã xong.

---

## 6. Cạm bẫy riêng của work item này

**P1 — Bảng neo của kế hoạch đánh dấu `verified: true` nhưng 2/3 sai.** Hai mục CHANGELOG (`:5` và `:7`) và mục `:1057` đều lệch. Nếu tác giả tin bảng đó và chèn vào "ngay dưới `[Unreleased]`" thì sẽ chèn **trên** khối `### Security` đang có, hoặc tệ hơn là tưởng dòng 1057 là mục #7955 rồi sửa nó. **Đọc file, đừng đọc bảng.**

**P2 — Regex OWNER/DATE của kế hoạch là theo vị trí, không theo hàng.** Đã có bằng chứng chạy ở §5.4. Viết bảng 4 cột (rất tự nhiên: `| Item | Description | OWNER | DATE |`) là **đỏ nhầm**. Dùng bảng 3 cột, hoặc dùng G3 ở 5.3.

**P3 — Dễ nhầm hai đường làm một sự thật.** Root project của `.omp/extensions` là `<cwd>/.omp` (`omp-extension-roots.ts:162`). Root project của **plugin** là `entry.installPath` (`helpers.ts:1300`) — **không phải** `<cwd>/.omp`. Gộp hai cái làm câu "What ships today" (b) sai, và (b) chính là câu mạnh nhất của cả ADR.

**P4 — `### Added` của `[Unreleased]` phải chèn SAU khối `### Security`, không phải "ngay dưới nó".** Kế hoạch dòng 383 nói "một mục `### Added` MỚI phải tạo ngay dưới nó". Ngay dưới `## [Unreleased]` (dòng 3) là `### Security` (dòng 5) với một entry dài về MCP project config. Chèn `### Added` vào giữa sẽ tách Security khỏi entry của nó. AGENTS.md nói `bun run release` chạy `fix-changelogs` và tự chuẩn hoá thứ tự, nên **đừng tranh luận thứ tự** — cứ chèn sau khối Security và đi tiếp.

**P5 — Test KHÔNG chạy được là tin cũ.** Tôi đã chạy: **3 pass / 0 fail**, addon native đã build. Viết "chưa chạy được" vào PR là hậu quả không chính đáng và làm giảm độ tin cậy của phần còn lại. Viết "3 pass / 0 fail tại HEAD `65cc6c1`" — đó là thật, và nó mạnh hơn.

**P6 — Chữ "cổng chặn" trong regex là tiếng Việt có dấu.** Regex ở 5.3 dùng `cổng chặn` và `nằm (trong|ngoài)`. Nếu ADR viết tiếng Anh ("inside the gate" / "out of scope"), **cổng đỏ**. Đây là một ràng buộc ngôn ngữ thật mà kế hoạch không nói. **Hoặc viết câu trả lời M2-OQ5 bằng tiếng Việt, hoặc sửa regex.** Đừng để tác giả phát hiện việc này ở review.

**P7 — `git add -N` là đòn bẩy một chiều.** Sau khi chạy, file ADR ở trạng thái intent-to-add. Không `git reset` nếu không muốn. Và nhớ: **không commit** (bước 7 của kế hoạch, và AGENTS.md).

**P8 — `docs/extension-loading.md` là con trỏ treo.** Jsdoc tại `types.ts:558-559` gửi người đọc tới `docs/extension-loading.md` (`... are already discovered and loaded unconditionally (see \`docs/extension-loading.md\`). This method exists for compatibility ...`), và `rg -i trust docs/extension-loading.md` **trả về không cái gì** (tôi đã chạy). Đây là một câu hỏi kế hoạch nêu ở "Cần người quyết" (dòng 492) nhưng **không nằm trong ba file của bảng File cần chạm tới**. Nếu ADR trả lời "extension tải vô điều kiện" mà file này vẫn im lặng, con trỏ vẫn treo. Ghi vào ADR rằng việc vá `docs/extension-loading.md` là hạng mục thứ hai cần chủ — hoặc sửa luôn, nhưng khi đó cổng "đúng ba file" sẽ đỏ.

---

## 7. Bảng neo đầy đủ — 22 neo, đã mở và đọc từng cái

| Neo trong kế hoạch | Kết luận | Thực tế ở HEAD `65cc6c1` |
| --- | --- | --- |
| `types.ts:487-494` | ⚠️ LỆCH 1 | Dòng 487 là jsdoc của `agent`, 488 là `	agent: ExtensionAgentIdentity;`. Khối jsdoc trust thật là **489–495**; khai báo ở **496**. Nội dung khớp: `OMP performs no project-trust gating — project-level settings and extensions load unconditionally — so this always returns \`true\`` |
| `types.ts:548-561` | ⚠️ LỆCH 2 | Khối jsdoc thật là **550–562**; khai báo ở **563**. Nội dung khớp, kể cả `extensions, settings, skills, resources` |
| `types.ts:561` (bước 7) | ❌ **HỎNG** | 561 = `	 * by default -- it does not narrow or widen OMP's own security model.` → đúng là **563** |
| `types.ts:1492` (bước 3, 6) | ❌ **HỎNG** | 1492 = `	// Actions` (vùng `sendMessage`). `ctx.exec` thật ở **1516–1517** |
| `runner.ts:1264` | ❌ **HỎNG** | 1264 nằm trong jsdoc `createContext`. `isProjectTrusted: () => true,` thật ở **1293** |
| `agent-session.ts:7406` | ❌ **HỎNG** | 7406 = `			if (this.isAutoThinking && isUserTurn) {`. `isProjectTrusted: () => true,` thật ở **7552** |
| `omp-extension-roots.ts:162` | ✅ **ĐÚNG** | `	project: path.join(ctx.cwd, ".omp"),` |
| `helpers.ts:1271-1307` | ✅ **ĐÚNG** | Đúng khối `// ── Project-scoped OMP registry ──`, cả 3 dòng jsdoc nguyên văn |
| `helpers.ts:1300` | ✅ **ĐÚNG** | `							scope: "project",` trong `projectRoots.push` (mở ở 1294) |
| `helpers.ts:1013-1021` | ⚠️ LỆCH | 1013–1023 là jsdoc; **nội dung walk order là 1015–1020**; 1021 là dòng ` *` trống |
| `helpers.ts:1025` | ✅ **ĐÚNG** | `export async function resolveActiveProjectRegistryPath(cwd: string): Promise<string \| null> {` |
| `loader.ts:19` | ✅ **ĐÚNG** | `	scope: "user" \| "project";` |
| `loader.ts:93-95` | ✅ **ĐÚNG** | 93 = tham số `scope`, 95 = `	const nodeModulesPath = path.join(root, "node_modules");` |
| `loader.ts:331` | ✅ **ĐÚNG** | `function resolvePluginPaths(…, key: "tools" \| "hooks" \| "commands" \| "extensions"): string[] {` |
| `loader.ts:407` | ✅ **ĐÚNG** | `	return resolvePluginPaths(plugin, "extensions");` |
| `CHANGELOG.md:3` | ✅ **ĐÚNG** | `## [Unreleased]` |
| `CHANGELOG.md:4` trống | ✅ **ĐÚNG** | trống |
| `CHANGELOG.md:5 = ## [18.3.3]` | ❌ **HỎNG** | 5 = `### Security`. `## [18.3.3] - 2026-09-27` ở **65** |
| `CHANGELOG.md:7 = ### Added của 18.3.3` | ❌ **HỎNG** | 7 = entry MCP của Security. `### Added` của 18.3.3 ở **67** |
| `CHANGELOG.md:1057` = mục #7955 | ❌ **HỎNG** | 1057 = `… \`models.yml\` … \`compat.stripImageInput\` … #11697`. Mục **#7955 ở dòng 1117** |
| Header `## [18.1.16]` ở 1039 | ❌ **HỎNG** | 1039 là dòng **trống**; `## [18.1.18] - 2026-09-11` ở **1040**. `## [18.1.16] - 2026-09-09` ở **1099**; mục #7955 nằm dưới nó, ở **1117** |
| `plan:257` = hợp đồng ba câu hỏi | ❌ **HỎNG** | 257 **hiện** là gạch đầu dòng `- **\`bun check\` và \`bun test\`. Không bao giờ \`tsc\`…`. Hợp đồng ba câu hỏi thật ở **plan:414–418** |
| `plan:323` = M2-OQ5 trong "Cần người quyết" | ❌ **HỎNG** | 323 **hiện** là `### Rẽ nhánh, và cách chọn`. `### Cần người quyết` của WI-0 ở **plan:486**; M2-OQ5 thật ở **plan:489** |

**Các khẳng định phụ đã kiểm và ĐÚNG — đừng nghi ngờ lại:**

| Khẳng định của kế hoạch | Kết quả |
| --- | --- |
| Token `R8` chỉ xuất hiện trong chính câu ở dòng 399 | ✅ `rg -n "R8"` → chỉ 399 |
| `docs/extension-loading.md` im lặng hoàn toàn về trust | ✅ `rg -i trust` → không kết quả |
| `docs/extension-trust-model.md` chưa tồn tại | ✅ `lsd` → `No such file or directory` |
| `docs/extensions.md` chưa có mục Trust | ✅ 912 dòng, không `isProjectTrusted`, không heading trust |
| Không có prompt/allowlist/cổng chặn nào trên đường tải | ✅ `rg` trên `src/discovery/` + `src/extensibility/` chỉ trả allowlist MCP tool và allowlist tiền tố byte |
| Project entry che khuất user entry | ✅ `helpers.ts:1311` comment + `:1313-1316` `roots.filter(r => !projectIds.has(r.id))` |

**Tổng: 11 đúng · 2 lệch nhẹ · 9 hỏng.**

> **Số dòng trong `MILESTONE_2_EXECUTION_PLAN.md` là biến động.** Trong lúc tôi làm phiếu này, file kế hoạch bị một tiến trình khác sửa (mtime 2026-09-29 07:40:48, `git diff --stat` = 34 insertions / 24 deletions, nội dung thay đổi ở mục "Điều kiện tiên quyết" và "Rẽ nhánh"). Số dòng `plan:*` tôi ghi ở trên là đã đối chiếu lại **với nội dung sau thay đổi đó**. Tác giả nên tra bằng `rg -n` chứ đừng tin số tuyệt đối. Các neo trong `packages/` và `docs/` không bị ảnh hưởng — HEAD vẫn là `65cc6c1`.

---

## 8. Nguồn tham chiếu cho nội dung ADR

Đã đọc, dùng để chốt nội dung ba phương án và câu trả lời M2-OQ5:

- **`/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/docs/security.md:27-91`** — mô hình trust upstream đã giao hàng. Cho: danh sách tài nguyên được bảo vệ, `~/.pi/agent/trust.json`, `defaultProjectTrust` (`ask`/`always`/`never`), `--approve`/`--no-approve`, event `project_trust`. **Đây là hình mẫu cụ thể cho phương án A.** Dòng 33 là câu trả lời M2-OQ5 mà upstream đã công bố.
- **`/Users/tranquangdang21/Projects/pi-ref/packages/coding-agent/src/core/settings-manager.ts:128,207,321,339-345`** — `defaultProjectTrust?: DefaultProjectTrust; // default: "ask"; global setting only` và `projectTrusted` đi qua `SettingsManager.create(cwd, agentDir, { projectTrusted })`. Đây chính là seam mà `types.ts:550-562` nói OMP đang giữ tương thích.
- **`/Users/tranquangdang21/Projects/codex-ref/codex-rs/tui/src/onboarding/directory_trust.rs:31`** — `pub(crate) async fn check_directory_trust(...)` của Codex. Một hệ khác, cùng bài toán.
- **`/Users/tranquangdang21/Projects/opencode-ref`** — `rg -l -i "projectTrusted|project_trust|isProjectTrusted"` → **không có kết quả nào**. Không lấy cảm hứng từ đây.

---

## 9. Không làm

- Không sửa file kế hoạch nào.
- Không chạm `runner.ts:1293`, `agent-session.ts:7552`, `types.ts` — đây là mục quyết định.
- Không sửa `CHANGELOG.md:1117` (đã phát hành, dưới `## [18.1.16]`).
- Không sửa hai file test.
- Không dùng `tsc` / `npx tsc`.
- Không commit.
