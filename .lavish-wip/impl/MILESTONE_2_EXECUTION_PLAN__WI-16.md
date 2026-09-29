# Phiếu triển khai — WI-16: Hai mặt cửa render cho extension

**Kế hoạch:** `MILESTONE_2_EXECUTION_PLAN.md` §"WI-16. GAP-M2-11" (dòng 1715)
**HEAD đã đối chiếu:** `65cc6c1` ("test(coding-agent): opt in explicitly where the suite is about parsing"), branch `milestone-1`.
**Lệch so với chính plan:** plan ghi HEAD là `808b365`. HEAD thật khi viết phiếu này là `65cc6c1`. Số dòng đã kiểm lại tại `65cc6c1`, không dùng số của `808b365`.

---

## ⚠ ĐỌC TRƯỚC — một điều trong work item này SAI, và nó làm hỏng cả hai dòng hợp đồng test

Plan lặp đi lặp lại một tiền đề: *"Đăng ký command / shortcut / tool / flag / message-renderer **không** silent drop: chúng đều có chẩn đoán trùng"* và *"Cả hai method mới phải dùng **cùng cơ chế chẩn đoán trùng, cùng thông điệp** với các method đăng ký khác."*

**Tiền đề đó sai. Cơ chế chẩn đoán trùng đó không tồn tại.**

Bằng chứng — `grep -nE "duplicat|already (registered|exists|defined)|conflict|collision" packages/coding-agent/src/extensibility/extensions/loader.ts`:

```
483: * (last-wins collisions, shared runtime flag defaults) stay deterministic.
```

Dòng 483 là **tài liệu hoá chính sách last-wins**, không phải một chẩn đoán. Người viết plan đã đọc nhầm dòng comment này thành một cơ chế kiểm tra trùng.

Và chính các method mà plan gọi là "đều có chẩn đoán trùng" đều là `Map.set` trần, không kiểm tra gì:

| method | dòng | thân hàm | có kiểm tra trùng? |
| --- | --- | --- | --- |
| `registerTool` | `loader.ts:216` | `this.extension.tools.set(tool.name, registered);` | KHÔNG |
| `registerCommand` | `loader.ts:234` | `this.extension.commands.set(name, { name, ...options });` | KHÔNG |
| `registerShortcut` | `loader.ts:249` | `this.extension.shortcuts.set(shortcut, {…});` | KHÔNG |
| `registerFlag` | `loader.ts:259` | `this.extension.flags.set(name, {…});` | KHÔNG |
| `registerMessageRenderer` | `loader.ts:269` | `this.extension.messageRenderers.set(customType, renderer);` | KHÔNG |

Cả 5 đều last-wins im lặng. `grep -n "throw new"` trong `extensions/loader.ts` chỉ có 3 chỗ **không liên quan tới trùng**: `ExtensionRuntimeNotInitializedError` (dòng 114-170, một loạt guard), và 3 throw của `registerComposerShape` (dòng 280/283/286 — kiểm tra id rỗng, label rỗng, và id builtin, **không** kiểm tra hai extension cùng đăng ký một id).

Trong nhánh hook, `hooks/loader.ts:114` y hệt:

```ts
registerMessageRenderer<T = unknown>(customType: string, renderer: HookMessageRenderer<T>): void {
    messageRenderers.set(customType, renderer as HookMessageRenderer);
},
```

**Hệ quả trực tiếp lên kế hoạch:**

- Bước 1 (*"Làm mờ trên `registerMessageRenderer` sẵn có, không chép gì từ `pi`"*) **không làm được** — không có gì để làm mờ. Điểm mở mà plan chỉ vào không phát ra chẩn đoán nào.
- DÒNG 1 của hợp đồng test (*"đăng ký trùng renderer trên cùng một entry được báo chẩn đoán trùng, **giống hệt các method đăng ký khác**"*) **không có thông điệp để so sánh**. Cụm "thông điệp chẩn đoán mà lớp `registerMessageRenderer` đã phát ra" mô tả một thứ không tồn tại.
- Cổng (2) của mục Cổng hoàn thành (*"báo chẩn đoán trùng **bằng cùng cơ chế và cùng thông điệp** với `registerMessageRenderer`"*) **không bao giờ đỏ được** vì không có thông điệp để khớp. Đây là một cổng luôn xanh — đúng thứ mà mục Luật của chính bài này cảnh báo.

**Đây là câu hỏi cần người quyết, không phải chi tiết để tự suy ra.** Xem §Cần người quyết bên dưới.

Có **một** chẩn đoán trùng thật trong toàn bộ bề mặt extension, nhưng nó không nằm ở chỗ plan chỉ và không nói về renderer:

`packages/coding-agent/src/extensibility/extensions/runner.ts:1214-1234`

```ts
getRegisteredCommands(reserved?: ReadonlySet<string>): RegisteredCommand[] {
    this.#commandDiagnostics = [];

    const commands = new Map<string, RegisteredCommand>();
    for (const ext of this.extensions) {
        for (const command of ext.commands.values()) {
            if (reserved?.has(command.name)) {
                const message = `Extension command '${command.name}' from ${ext.path} conflicts with built-in commands. Skipping.`;
                this.#commandDiagnostics.push({ type: "warning", message, path: ext.path });
                if (!this.hasUI()) {
                    logger.warn(message);
                }
                continue;
            }

            commands.set(command.name, command);
        }
    }
    return [...commands.values()];
}
```

Đây là **mẫu duy nhất** trong codebase để làm "đăng ký trùng → chẩn đoán". Nhưng nó so với *built-in commands* (`reserved`), **không** so với extension-vs-extension. Plan ở bước 5 đòi test "hai extension cùng thay renderer của một entry" — đó là extension-vs-extension, tức là **một chiều mà chính mẫu duy nhất hiện có cũng không phủ**.

---

## VIỆC 1 — Kiểm lại từng neo

Work item có **3 neo**, tất cả đều **đúng**. Nhưng hai cái sau chỉ đúng về *vị trí dòng*, sai về *nội dung mà tài liệu nói nó chứa*.

### Neo 1 — `packages/coding-agent/src/extensibility/extensions/loader.ts:269` ✅ ĐÚNG

`grep -n registerMessageRenderer` → `loader.ts:269`. `sed -n '269p'`:

```ts
	registerMessageRenderer<T>(customType: string, renderer: MessageRenderer<T>): void {
```

Đúng dòng. **Nhưng nội dung dòng này không phát ra chẩn đoán trùng** — thân hàm (dòng 270) là `this.extension.messageRenderers.set(customType, renderer as MessageRenderer);`. Đây là last-wins im lặng. Plan dùng neo này làm "khuôn làm mở" cho cơ chế chẩn đoán trùng → **anchor đúng, claim sai**.

### Neo 2 — `packages/coding-agent/src/extensibility/hooks/loader.ts:114` ✅ ĐÚNG

`grep -n registerMessageRenderer` → `hooks/loader.ts:114`. `sed -n '114p'`:

```ts
		registerMessageRenderer<T = unknown>(customType: string, renderer: HookMessageRenderer<T>): void {
```

Đúng dòng, đúng vai trò (nhánh hook). Cũng last-wins im lặng (dòng 115). Cùng vấn đề claim.

### Neo 3 — `packages/coding-agent/src/extensibility/extensions/types.ts:1475` ✅ ĐÚNG

`grep -n registerMessageRenderer` → `types.ts:1475`. `sed -n '1475p'`:

```ts
	registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;
```

Đúng dòng, đúng là **đặc tả** (khai báo trong interface, không phải thân hàm). Đây là chỗ đúng để đặt đặc tả hai method mới.

### Các neo ngầm trong mục "File cần chạm tới"

Bảng file ghi `loader.ts:269` và `hooks/loader.ts:114` — đã kiểm ở trên, đúng. `types.ts:1475` — đúng.

### Kiểm chứng claim "0 hit"

```bash
grep -rniE 'registerEntryRenderer|registerMarkdownTransformer|markdownTransformer' packages --include='*.ts' | wc -l
# → 0
```

**Đúng.** Hai method thật sự vắng mặt. Claim này của plan là chính xác.

### Kiểm chứng claim "bề mặt render: TUI và ACP"

Plan nói ranh giới là "chỉ TUI và ACP". Điều tra `getMessageRenderer` (call site thực sự dùng renderer):

```
modes/utils/ui-helpers.ts:257          → new CustomMessageComponent(message, renderer)
modes/controllers/selector-controller.ts:1090 → getMessageRenderer: type => …
modes/controllers/selector-controller.ts:1221 → getMessageRenderer: type => …
modes/controllers/selector-controller.ts:2188 → getMessageRenderer: type => …
extensibility/hooks/runner.ts:185       (định nghĩa)
extensibility/extensions/runner.ts:1200 (định nghĩa)
```

`ui-helpers.ts:23` import `CustomMessageComponent` từ `@oh-my-pi/pi-tui/chat/custom-message`. Tất cả call site đều nằm trong `modes/` (TUI). `modes/acp/acp-agent.ts` có `extensionRunner` (dòng 2562) nhưng **không** gọi `getMessageRenderer` ở bất kỳ đâu — `grep -n "getMessageRenderer\|messageRenderer" modes/acp/*.ts` không trả về gì.

**Nghĩa là: hôm nay render surface của `registerMessageRenderer` là TUI-ONLY, không phải "TUI và ACP".** ACP hiện không tiêu thụ message renderer. Điều này **không** làm hỏng mục tiêu của WI-16 (thêm transformer cũng vậy), nhưng nó có nghĩa là câu hỏi "mở thêm bề mặt nữa không" của plan đang hỏi về một bề mặt chưa tồn tại. Ghi lại, không sửa plan.

### Kiểm chứng cổng môi trường

Plan nói: *"Bị chặn cho tới khi có native addon: `bun test` chết ngay ở bước import với `Failed to load pi_natives native addon for darwin-arm64`."*

**Sai ở HEAD này.** Đã chạy thật:

```
$ cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts
 1 pass  0 fail  2 expect() calls
```

```
$ cd packages/coding-agent && bun test test/extension-loader-graph-read-dedup.test.ts test/extension-flag-dispatch.test.ts
 3 pass  0 fail  22 expect() calls
```

`bun test` chạy được, không cần build addon. Và `bun run check:ts` từ **repo root** exit 0 (chạy đầy đủ, kết thúc bằng `@oh-my-pi/typescript-edit-benchmark:check:types | Done`).

Lưu ý vận hành: `check:ts` là script **root**, không phải của package. `cd packages/coding-agent && bun run check:ts` → `error: Script not found "check:ts"`. Phải chạy từ gốc repo.

---

## VIỆC 2 — Phiếu triển khai

### 1. Cái gì thay đổi, quan sát được

Một extension giờ đăng ký được hai thứ nó không đăng ký được trước đây — thay renderer của **một entry cụ thể** (thay vì một `customType` tổng quát), và biến đổi Markdown trước khi nó được vẽ lên màn hình — cả hai chỉ trên bề mặt TUI, và cả hai dùng **một** cơ chế báo trùng **mới**, vì cơ chế báo trùng mà plan dựa vào không tồn tại.

### 2. Bảng điểm sửa

| đường/dẫn | symbol | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/extensibility/extensions/types.ts:1475` | `ExtensionAPI.registerMessageRenderer` | `registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;` | giữ nguyên; **thêm** ngay dưới: `registerEntryRenderer<T = unknown>(entryId: string, renderer: EntryRenderer<T>): void;` và `registerMarkdownTransformer(transformer: MarkdownTransformer): void;` |
| `packages/coding-agent/src/extensibility/extensions/loader.ts:269` | `ConcreteExtensionAPI.registerMessageRenderer` | `registerMessageRenderer<T>(customType: string, renderer: MessageRenderer<T>): void {` / thân: `this.extension.messageRenderers.set(customType, renderer as MessageRenderer);` | giữ nguyên; **thêm** hai method mới, cùng thân `Map.set` last-wins, **không** thêm kiểm tra trùng (xem §Cổng) |
| `packages/coding-agent/src/extensibility/hooks/loader.ts:114` | `HookAPI.registerMessageRenderer` | `registerMessageRenderer<T = unknown>(customType: string, renderer: HookMessageRenderer<T>): void {` / thân: `messageRenderers.set(customType, renderer as HookMessageRenderer);` | giữ nguyên; **thêm** hai method mới ở nhánh hook, cùng hình dạng |
| `packages/coding-agent/src/extensibility/extensions/runner.ts:1214` | `getRegisteredCommands` (mẫu chẩn đoán duy nhất có sẵn) | `if (reserved?.has(command.name)) {` … `this.#commandDiagnostics.push({ type: "warning", message, path: ext.path });` | **thêm** một hàm cùng hình dạng cho entry renderer: so giữa các extension, `#entryRendererDiagnostics` + `getEntryRendererDiagnostics()` |
| `packages/coding-agent/src/modes/utils/ui-helpers.ts:257` | dòng dựng `CustomMessageComponent` | `const renderer = this.ctx.viewSession.extensionRunner?.getMessageRenderer(message.customType);` | nối thêm `applyMarkdownTransformers` **tại đây**, đúng bề mặt TUI, không nối ở tầng session |

Hai type mới cần khai ở `types.ts` cạnh `MessageRenderer` (định nghĩa quanh `types.ts:1837` nơi `messageRenderers: Map<string, MessageRenderer>` được khai):

```ts
export type EntryRenderer<T = unknown> = (entry: T) => readonly TUIBlock[] | null;
export type MarkdownTransformer = (markdown: string) => string;
```

### 3. Các bước

**Bước 0 — CHỐT CƠ CHẾ TRÙNG TRƯỚC KHI VIẾT DÒNG NÀO.**
Đây là bước chặn. Chọn một trong hai và ghi vào phiếu:
- **(a) Bám last-wins** như `registerMessageRenderer` thật sự làm: hai method mới cũng `Map.set` im lặng. Nhất quán với 5 method anh em, nhưng DÒNG 1 của hợp đồng test **rơi ra** và cổng (2) **bị xoá**, vì không có thông điệp nào để so.
- **(b) Thêm cơ chế trùng MỚI** theo mẫu `getRegisteredCommands` (`runner.ts:1214-1234`): so giữa các extension, gom vào `#entryRendererDiagnostics`, phát qua `logger.warn` khi `!hasUI()`. Tốn thêm ~1 ngày so với ước lượng S của plan, và phải trả lời câu hỏi: **có báo trùng cho cả `registerMessageRenderer` cũ không?** Nếu không, thì chính xác là cái lệch mà bước 1 của plan cấm — và bước 1 phải được viết lại.

*(Nếu chọn (b), bước dưới đây thay "không thêm kiểm tra trùng" bằng "thêm theo mẫu runner.ts:1214".)*

**Bước 1 — Khai hai type ở `types.ts`.** Cạnh `MessageRenderer`, quanh `types.ts:1837`. Không có type thì không có cách ghi ranh giới bề mặt ở tầng kiểu (bước 3).

**Bước 2 — Khai hai method trong `ExtensionAPI`, ngay dưới `types.ts:1475`.** Đặc tả ba chữ. Đây là **điểm neo duy nhất** bảo đảm ranh giới "chỉ TUI" nằm trong kiểu: thêm `getRegisteredCommands`-tương-tự vào interface thì một call site RPC sẽ không còn chỗ để gọi nhầm.

**Bước 3 — Thân method ở `loader.ts:269`.** Bản sao hình dạng của `registerMessageRenderer` (dòng 269-271): `this.extension.entryRenderers.set(entryId, renderer)` và `this.extension.markdownTransformers.push(fn)`. `push` cho transformer là **còn lựa chọn** — nhiều transformer nối tiếp hợp lý hơn last-wins, và nó né được câu hỏi trùng. Nói rõ trong doc.

**Bước 4 — Thân method ở `hooks/loader.ts:114`.** Cùng hình dạng, cho `HookAPI`.

**Bước 5 — Nối bề mặt. CHỈ ở `ui-helpers.ts:257`.** Đây là nơi duy nhất renderer được dựng thành component TUI. **Không** nối ở `session/agent-session.ts`, **không** nối ở `sdk.ts`, **không** nối ở `modes/rpc/rpc-mode.ts`, **không** nối ở `modes/acp/`. Đây là bước làm cho DÒNG 2 của hợp đồng test thành sự thật về cấu trúc chứ không phải về doc.

**Bước 6 — Test xung đột.** Theo §Hợp đồng test.

*(Không neo ở bước 6 vì mục WI-16 tự ghi `(neo: không)` — bước này không có sẵn dòng để trỏ.)*

### 4. Hợp đồng test

**File:** `packages/coding-agent/test/extension-render-registration.test.ts` — file riêng, không nhét vào `extensions-runner.test.ts` (file đó đã 131 KB). Câu hỏi "chung hay riêng" mà plan nêu ở mục Cần người quyết: **đề xuất riêng**, vì WI-16 không chạm `session/agent-session.ts` ở bất kỳ bước nào (xem §Cạm bẫy), nên lý do gộp của plan không có.

**DÒNG 1 — "Hai extension cùng đăng ký renderer cho một entry."**
- `it("reports a duplicate when two extensions register a renderer for the same entry")`
- Case: hai extension, cùng `entryId`, gọi `registerEntryRenderer` cùng id.
- Khẳng định: hành vi **đúng với lựa chọn ở Bước 0** —
  - (a) last-wins: renderer sau thắng, **không** có diagnostic, và test **phải assert sự im lặng đó** (`expect(diagnostics).toEqual([])`) để nó thành hợp đồng có chủ ý chứ không phải sơ suất.
  - (b) có diagnostic: `expect(diagnostics).toHaveLength(1)` và `expect(diagnostics[0].message).toContain(<thông điệp>)`.
- **Người dùng thấy gì nếu hồi quy:** việc ghi đè renderer của entry mình đang sửa diễn ra âm thầm, hoặc ngược lại một lỗi trùng giả bị ném ra giữa lúc chạy. Cả hai đều là "hỏng không có stack trace của omp".

**DÒNG 2 — "Transformer không chạy trên đường RPC/JSON."**
- `it("leaves the RPC/JSON path as raw data when a markdown transformer is registered")`
- Case: đăng ký transformer trả về `"<<<X>>>"`, rồi đọc entry qua đường serialize JSON.
- Khẳng định: `expect(serialized).not.toContain("<<<X>>>")` và `expect(serialized).toContain(<markdown gốc>)`.
- **Người dùng thấy gì nếu hồi quy:** một client đọc transcript nhận về Markdown đã bị biến đổi, hỏng ở phía client — nơi không có stack trace nào trỏ về omp. Đây là cái hỏng đắt nhất trong mục này.

**DÒNG 3 (bổ sung, để cổng (2) đỏ được).**
- `it("keeps the duplicate diagnostic message identical to the one the other registration methods emit")`
- Chỉ tồn tại nếu Bước 0 chọn (b). Nếu chọn (a), dòng này **không viết** và cổng (2) bị xoá khỏi mục Cổng.

### 5. Cổng

**Cổng (1) — TYPE.**
```bash
bun run check:ts   # từ GỐC repo, không phải từ packages/coding-agent
```
Đỏ được không: **CÓ.** Đã chạy thật tại HEAD `65cc6c1` → exit 0. Đỏ được vì `types.ts` khai `registerMarkdownTransformer` chỉ trong `ExtensionAPI`, và không có consumer nào ngoài TUI nhận nó — thêm một call site gọi nó ở tầng RPC sẽ không có symbol để gọi.

**Cổng (2) — DÒNG XUNG ĐỘT. KHÔNG ĐỎ ĐƯỢC. Phải viết lại.**
Cách plan nêu: *"hai extension cùng thay renderer của một entry thì báo chẩn đoán trùng **bằng cùng cơ chế và cùng thông điệp** với `registerMessageRenderer`"* — không đỏ được, vì `registerMessageRenderer` **không phát ra chẩn đoán nào** (đã chứng minh ở trên). Cổng này sẽ xanh vĩnh viễn: so sánh hai thông điệp, trong đó một thông điệp không tồn tại.

Viết lại thành một trong hai, tùy Bước 0:
- **(a)** Xoá hẳn cổng (2). Dòng 1 của hợp đồng test đổi thành "last-wins, im lặng, có chủ ý" và assert sự im lặng đó.
- **(b)** `expect(diagnostics[0].message).toBe(<thông điệp cụ thể>)` — đỏ được **vì** thông điệp là hằng số viết trong test. Đỏ khi ai đó đổi câu chữ. Nhưng nó **không** còn là so sánh "cùng thông điệp với `registerMessageRenderer`" — phải nói thẳng là so với hằng số trong test, và trả lời câu hỏi `registerMessageRenderer` cũ có được báo trùng không.

**Cổng (3) — DÒNG RPC.**
Đỏ được không: **CÓ, nhưng phải chạy đúng chỗ.** Lệnh:
```bash
bun test test/extension-render-registration.test.ts
```
Đỏ được vì assert `expect(serialized).not.toContain("<<<X>>>")` hỏng **ngay** nếu ai đó nối `applyMarkdownTransformers` vào tầng session thay vì `ui-helpers.ts:257`. Đây là cổng duy nhất của mục này thật sự bảo vệ ranh giới bề mặt — và nó bảo vệ bằng **vị trí call site**, không bằng type. Type chỉ ngăn việc gọi nhầm từ *code mới*; test ngăn việc *di chuyển* transformer xuống tầng dưới.

**Về môi trường (đính chính so với plan):**
Plan nói `bun test` bị chặn bởi native addon. **Không còn đúng** tại `65cc6c1` — đã chạy thật, pass, không cần build addon. Cổng kiểm chứng lại trước khi giao:
```bash
cd packages/coding-agent && bun test test/extension-flag-dispatch.test.ts   # kỳ vọng 1 pass
```

`gate_can_fail: true` trong plan là **sai** với hiện trạng: với (1) và (3) đã đỏ được thật, cổng đã đỏ được. Chỉ (2) là cổng chết.

### 6. Cạm bẫy riêng của work item này

**Cạm bẫy lớn nhất — và nó đã xảy ra với chính plan này: tin `registerMessageRenderer` là khuôn làm mở.** Plan đọc dòng comment `last-wins collisions ... stay deterministic` ở `loader.ts:483` rồi kết luận ngược: rằng có một cơ chế chẩn đoán trùng đang hoạt động. Thực tế dòng đó **mô tả** việc không kiểm tra. Cả ba bước đầu của work item đều xây trên chỗ này. Khi gõ, **đọc thân hàm, không đọc tên method và không đọc comment** — 5 method `register*` trông giống hệt nhau nhưng chỉ `registerComposerShape` mới có throw, và throw đó cũng không phải vì trùng.

**Cạm bẫy thứ hai — "bề mặt chỉ TUI và ACP" là một ranh giới trên giấy.** ACP không tiêu thụ message renderer hôm nay (`modes/acp/acp-agent.ts` có `extensionRunner` nhưng không gọi `getMessageRenderer`). Nếu bạn tin ranh giới này và nối transformer vào "tầng chung của TUI+ACP" một cách trừu tượng, bạn sẽ tạo ra một tầng mà không ai tiêu thụ. Hãy nối vào **đúng một chỗ đã đọc và kiểm chứng**: `ui-helpers.ts:257`.

**Cạm bẫy thứ ba — `registerEntryRenderer` chồng lấn với `registerMessageRenderer`.** `registerMessageRenderer` đã gắn renderer vào một `customType` qua `Map<string, MessageRenderer>`; một `registerEntryRenderer` gắn vào `entryId` là hai keyspace khác nhau trên cùng một bề mặt. Nếu không chốt rõ ranh giới, extension tác giả sẽ không biết dùng cái nào, và khi một entry trở thành `CustomMessageEntry` thì hai renderer sẽ tranh nhau. Chốt: `registerEntryRenderer` thắng, hay cộng dồn, hay cấm? Chốt trước khi viết type.

**Cạm bẫy thứ tư — bước 5 của plan không có neo, và bước đó là bước duy nhất làm cho DÒNG 2 của hợp đồng test thành sự thật.** Bước 5 ghi `(neo: không)`. Viết nó mà không mở `ui-helpers.ts:257` là cách chắc chắn nhất để đặt transformer vào tầng session — chỗ mà nó sẽ chạy trên cả RPC và phá client, đúng cái hỏng mà cả mục này viết ra để tránh.

---

## Cần người quyết (bổ sung ngoài những gì plan đã nêu)

1. **Bước 0 — chọn (a) last-wins hay (b) thêm cơ chế trùng mới.** Đây là quyết định chặn cả hai dòng hợp đồng test và cổng (2). Plan đã đi sai ở đây và không hỏi; phải hỏi. Nếu (b): có báo trùng cho `registerMessageRenderer` cũ không, và effort có còn là S?

2. **Test file: riêng hay chung.** Đề xuất **riêng** (`test/extension-render-registration.test.ts`). Lý do gộp mà plan đưa ra — "WI-3 và WI-16 cùng chạm `session/agent-session.ts`" — **không đúng với WI-16**: không bước nào của WI-16 chạm file đó. Call site duy nhất là `modes/utils/ui-helpers.ts:257`.

3. **"TUI và ACP" — có cần mở ACP không?** Hiện ACP không render custom message. Nếu câu trả lời là "chỉ TUI", thì ranh giới ghi trong type nên là "TUI-only" và câu hỏi mở ACP được đóng luôn.

---

## Tóm tắt đối chiếu

| hạng mục | kết quả |
| --- | --- |
| Số neo trong work item | 3 |
| Neo đúng cả dòng lẫn claim | 0 |
| Neo đúng dòng, sai claim | 3 (`loader.ts:269`, `hooks/loader.ts:114`, `types.ts:1475`) |
| Claim "0 hit" cho hai method mới | ✅ đúng, đã xác minh |
| Claim "các method đăng ký đều có chẩn đoán trùng" | ❌ **sai** — 5/5 đều last-wins im lặng |
| Claim "bề mặt render là TUI và ACP" | ❌ sai — chỉ TUI; ACP không gọi `getMessageRenderer` |
| Claim "`bun test` bị chặn bởi native addon" | ❌ **stale** — đã chạy thật, pass, không cần addon |
| Claim "`bun run check:ts`" | ✅ đúng, nhưng phải chạy từ **gốc repo** |
| HEAD trong plan (`808b365`) | ❌ lệch — HEAD thật `65cc6c1` |
| Cổng (1) TYPE đỏ được | ✅ có |
| Cổng (2) DÒNG XUNG ĐỘT đỏ được | ❌ **không** — phải viết lại |
| Cổng (3) DÒNG RPC đỏ được | ✅ có |
