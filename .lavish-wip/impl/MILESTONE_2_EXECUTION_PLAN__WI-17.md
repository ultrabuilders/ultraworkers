# PHIẾU TRIỂN KHAI — WI-17: Giới hạn khối `<skills>` + `manage_skill list`

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_2_EXECUTION_PLAN.md:2485-2568`
**Cây tham chiếu chính:** `/Users/tranquangdang21/Projects/ultraworkers` (omp), `/Users/tranquangdang21/Projects/codex-ref` (đối chứng duy nhất)
**Ngày kiểm:** 2026-09-29. Mọi trích dưới đây đã mở file và đọc dòng thật.

---

## 0. KẾT QUẢ KIỂM LẠI TỪNG NEO

Bảng này là phần quan trọng nhất của phiếu. **Không có neo nào sai hoàn toàn**, nhưng **sáu trong chín neo sai một phần**, và ba cái sai đó thay đổi việc gõ.

| # | Neo trong tài liệu | Trích dòng thật | Verdict |
|---|---|---|---|
| 1 | `prompts/system/system-prompt.md:30-35` là `{{#each skills}} - {{name}}: {{description}} {{/each}}`, **không có trần** | `:30` = `<skills>`, `:31` = `{{#each skills}}`, `:32` = `- {{name}}: {{description}}`, `:33` = `{{/each}}`, `:34` = `</skills>`, `:35` = `{{/if}}` | **ĐÚNG NỘI DUNG, SAI ĐƯỜNG DẪN + LỆCH 1 DÒNG.** File thật là `packages/coding-agent/src/prompts/system/system-prompt.md` (238 dòng), **không có** `prompts/` ở gốc repo — `ls prompts` → `No such file or directory`. Vòng lặp nằm ở **31-33**, không phải 30-35; 30-35 là cả khối `<skills>`. Claim "không có trần" là **đúng**. |
| 2 | `packages/coding-agent/src/config/registry.ts` — nơi đặt "một hằng duy nhất cho ngưỡng trần" | File tồn tại (36 KB). Docstring `:1-4`: *"Settings registry: typed handles for every setting."* Export chính: `register()` `:786`, `Setting` `:455`, `Derived`, `lookup` `:795`, `all` `:800`. | **SAI VỀ BẢN CHẤT — đây là cổng số 1 của phiếu.** Đây **không phải** file hằng. Mọi export ở đây là handle do `register()` sinh ra, hoặc là type của framework setting. Thả `export const MAX_SKILLS = 20` vào đó là một mồ côi nằm ngoài hợp đồng của file. Xem Mục 6. |
| 3 | `packages/coding-agent/src/tools/manage-skill.ts:17` = `action: "'create' \| 'update' \| 'delete'"` | `sed -n '17p'` → `	action: "'create' \| 'update' \| 'delete'",` | **CHÍNH XÁC TỪNG BYTE.** ✓ |
| 4 | `packages/coding-agent/src/…/skill-descriptions.ts` — `MAX_COMPRESSED_WORDS = 12` | `packages/coding-agent/src/extensibility/skill-descriptions.ts:16` = `const MAX_COMPRESSED_WORDS = 12;` | **CHÍNH XÁC.** ✓ Nhưng phần diễn giải *"nén description xuống 12 từ"* thì ** imprecise**: nó là **cổng từ chối** trong `validCompression` (`:95` `if (line.split(/\s+/).length > MAX_COMPRESSED_WORDS) return null;`) — một bản nén do LLM sinh ra dài hơn 12 từ bị **vứt đi**, rồi lùi về `previewSkillDescription`. Không phải cắt bớt description gốc. Kết luận của tài liệu ("nén từng mục, không chọn mục") vẫn **đúng**. |
| 5 | `skillful` chuyển khối `<skills>` sang `skillful-notice.md`, vẫn liệt kê tất cả | `packages/coding-agent/src/prompts/system/skillful-notice.md` chứa `{{#each skills}}` / `- {{name}}: {{description}}` / `{{/each}}` — không trần. Render ở `agent-session.ts:9317` `content: prompt.render(skillfulNoticePrompt, { skills: renderedSkills })`. | **ĐÚNG.** ✓ Và điều này sinh ra cạm bẫy C ở Mục 6. |
| 6 | `git grep -ril 'bm25\|reciprocal.rank\|ngram' -- packages/ crates/` **chỉ trúng** `crates/pi-predict` | Lệnh trả về **44 file**. Ngoài `crates/pi-predict` còn có `crates/pi-natives/src/predict.rs`, 4 file tokenizer JSON, `packages/ai/src/providers/*`, `packages/agent/src/types.ts`, `packages/catalog/src/compat/axes.ts`, `packages/coding-agent/src/predict/*`, `packages/tui/src/prompt/word-completion.ts`… | **SỐ ĐO SAI — kết luận vẫn đúng.** 44 hit đều thuộc ngăn xếp dự đoán token / một literal tool-name / một chuỗi compat-axis; **không** cái nào là bộ xếp hạng skill. Nên: **kết luận "thiếu ranker" giữ nguyên, con số "chỉ trúng 1 crate" phải bỏ.** Không được dùng lại lệnh này làm bằng chứng trong PR. |
| 7 | `dynamic_skill_selector/` của codex là **87 file / 22.712 dòng** | `codex-ref/codex-rs/ext/skills/src/dynamic_skill_selector/` = **20 file / 2.703 dòng** (10 file hiện thực + 9 file `*_tests.rs` + 1). Con số **87 file / 22.712 dòng** là của **cả crate `ext/skills`**: `find -type f \| wc -l` = 87, `find -name '*.rs' -exec cat + \| wc -l` = 22712. | **SAI — phóng đại 8,4×.** Đây là con số **gánh trọng** cho toàn bộ lập luận "đừng port". Cái thật sự cản trở là 2.703 dòng, không phải 22.712. Lập luận đúng, số sai. (Bonus: "tám bộ ranker" — thư mục có **10** file hiện thực, gần đúng chứ không đúng.) |
| 8 | `bun test` chết với `"Failed to load pi_natives native addon for darwin-arm64"`, gỡ bằng `bun --cwd=packages/natives run build` | `packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại**, 185 MB, build 2026-09-29 07:32. `bun test packages/coding-agent/test/skill-descriptions.test.ts` → `3 pass / 0 fail`. | **HỎNG (đã hết hạn).** `bun test` chạy được **ngay bây giờ**. Đừng viết lại đoạn gỡ chặn này vào PR — nó sẽ làm người đọc tưởng phải build native vô ích. |
| 9 | `bun run check:ts` chạy được không cần addon | `package.json:90` `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`. Chạy thật: `bun run check:tools` → oxlint+oxfmt OK (1 warning cũ, không chặn); `packages/coding-agent` `check:types` (`tsgo --noEmit`) → exit 0, không output. | **ĐÚNG.** ✓ |

### Ngoài ra: sáu thứ work item **không** nhắc, mà kỹ sư sẽ đụng phải

| # | Sự thật trên cây thật | Vì sao nó quan trọng |
|---|---|---|
| A | **`manage_skill` không tồn tại trong cây mặc định.** `manage-skill.ts:52-55` `static createIf(session) { if (!cfgAutolearnEnabled.get(session.settings)) return null; … }`, và `autolearn/settings.ts:13` `default: false`. | Plan nói nửa `list` "**quan trọng hơn** nửa trần". Nhưng với cấu hình mặc định, tool không được đăng ký → trần là **mất thông tin thuần**, không phải tối ưu hoá. Cổng (2) của tài liệu **ĐÚNG** nhưng **vô hiệu theo mặc trải nghiệm mặc định**. Đây là phát hiện lớn nhất của lượt kiểm này. |
| B | **Trần không thể đặt trong template.** `packages/utils/src/prompt.ts` đăng ký helper: `arg, join, default, ifAny, ifAll, codeblock, xml, escapeXml, len, add, sub, includes, not, jsonStringify`. **Không có** helper giới hạn `{{#each}}`. | Trần **bắt buộc** phải nằm ở `system-prompt.ts:945`, ngay chỗ dựng `filteredSkills`, chứ không ở `system-prompt.md`. |
| C | `manage-skill.ts:46` `readonly strict = true;`, và comment `:27-30` nói rõ: *"Kept as a cross-field narrow (not a discriminated union) so the wire schema stays a single root object — strict structured-output mode and the Anthropic tool-schema builder both require that."* | Thêm `list` **không được** biến schema thành discriminated union; đồng thời `.narrow()` ở `:24-32` phải nới ra, và `name` (đang bắt buộc ở `:18`) phải thành tuỳ chọn. |
| D | `system-prompt.md:28` mở đầu bằng `{{#if skills.length}}`, đóng ở `:35` `{{/if}}`. | Nếu trần từng làm ra danh sách rỗng thì **cả khối biến mất**, kể cả dòng `Matching skill → MUST read \`skill://<name>\` first.` ở `:29`. Trần phải có sàn = 1. |
| E | `docs/tools/manage_skill.md` có bảng `Inputs` liệt kê `action` là `"create" \| "update" \| "delete"`, cùng mục `Flow` bước 2 và mục `Errors`. | Không nằm trong "File cần chạm tới" của tài liệu. Sửa schema mà không sửa doc này là tài liệu nói dối. |
| F | `packages/coding-agent/src/prompts/tools/manage-skill.md` (prompt model đọc) liệt kê đúng ba action dạng bullet. | Cũng không có trong danh sách file. Model không đọc action thứ tư nếu prompt không nói. |
| G | Đã có sẵn một phần đường tra cứu: `internal-urls/skill-protocol.ts:52-56` khi `skill://<name>` sai thì lỗi kèm `Available: <danh sách tên>`; `:158-163` `complete()` trả `{ value: name, description }` cho **mọi** skill. | Đừng viết lại. `manage_skill list` nên tái dùng `getActiveSkills()` (`extensibility/skills.ts:59`) thay vì tự quét. |

---

## 1. CÁI GÌ THAY ĐỔI, QUAN SÁT ĐƯỢC

> Ở một cây có nhiều skill, khối `<skills>` trong system prompt dừng lại ở ngưỡng cố định kèm một dòng báo "còn N skill nữa, gọi `manage_skill list` để xem"; và model luôn có một cách **tra cứu** tên + description của mọi skill — kể cả khi trần đang bật.

Hai mệnh đề, cùng bật/tắt. Mệnh đề thứ hai **là điều kiện để mệnh đề thứ nhất không phải là mất mát thông tin** — nếu không có nó, cả work item này là một sự hại.

**Điều kiện tiên quyết chưa ai chốt, và nó có thể đổi cả kết luận:** `manage_skill` hiện chỉ tồn tại khi `autolearn.enabled = true` (mặc định `false`). Nếu `list` đi theo cùng cổng đó thì người dùng mặc định **vừa mất danh sách vừa không có đường tìm lại**. Xem bước 3.

---

## 2. BẢNG ĐIỂM SỬA

TRƯỚC — trích nguyên văn từ file thật, đã mở đọc.

| Đường dẫn | Symbol | TRƯỚC (nguyên văn) | SAU (hình dạng sau khi sửa) |
|---|---|---|---|
| `packages/coding-agent/src/prompts/system/system-prompt.md:28-35` | khối `<skills>` trong template | `{{#if skills.length}}`<br>`Matching skill → MUST read \`skill://<name>\` first.`<br>`<skills>`<br>`{{#each skills}}`<br>`- {{name}}: {{description}}`<br>`{{/each}}`<br>`</skills>`<br>`{{/if}}` | **Dưới trần: y hệt, không đổi một byte.** Vượt trần: thêm một dòng báo đếm phần bị ẩn, dạng `{{#if overflowCount}}…{{/if}}` — số lượng **và** tên các skill bị ẩn, không chỉ số. `len` helper (`:461`) làm được phép so sánh. |
| `packages/coding-agent/src/config/registry.ts` | — | File là settings registry; **không** có `MAX_SKILLS` | **Không thêm hằng thô ở đây.** `registry.ts` chỉ chứa handle do `register()` sinh ra và type của framework setting — thêm `export const` sẽ phá đúng điều docstring `:1-4` mô tả. Chọn một trong: (a) `register()` thật, có `ui` → thành setting lộ ra được, hoặc (b) hằng ở **file của miền skill**, `extensibility/skill-descriptions.ts` cạnh `MAX_PREVIEW_CHARS`/`MAX_COMPRESSED_CHARS`/`MAX_COMPRESSED_WORDS`. (b) là lựa chọn đúng vì ba hằng giới hạn kia đã nằm ở đó. |
| `packages/coding-agent/src/system-prompt.ts:945-947` | `filteredSkills` | `const filteredSkills = (options.skillDescriptions ?? new SkillDescriptionCatalog()).render(`<br>`    hasSkillReader ? skills.filter(skill => skill.hide !== true) : [],`<br>`);` | Thêm một bước cắt **sau** `.render()`, ngay đây: `const capped = applySkillCap(filteredSkills)`, rồi `skills: capped.shown` + `skillOverflow: capped.hidden` vào `data` (`:979`). Sửa ở đây vì template không có helper giới hạn (B). |
| `packages/coding-agent/src/system-prompt.ts:979` | `data.skills` | `		skills: filteredSkills,` | `		skills: cappedSkills,` + một key mới cho phần bị ẩn. |
| `packages/coding-agent/src/tools/manage-skill.ts:17` | `manageSkillSchema.action` | `	action: "'create' \| 'update' \| 'delete'",` | `	action: "'create' \| 'update' \| 'delete' \| 'list'",` |
| `packages/coding-agent/src/tools/manage-skill.ts:18` | `manageSkillSchema.name` | `    name: type("string").describe("kebab-case skill name"),` | `    "name?": type("string").describe("kebab-case skill name (required for create/update/delete)"),` — bắt buộc, vì `list` không có một skill duy nhất để đặt tên. |
| `packages/coding-agent/src/tools/manage-skill.ts:24-32` | `.narrow()` | `        p.action === "delete" \|\|` | `        p.action === "delete" \|\|`<br>`        p.action === "list" \|\|` — và giữ nguyên lời giải thích ở `:27-30` rằng đây **phải** là cross-field narrow, không phải discriminated union (C). |
| `packages/coding-agent/src/tools/manage-skill.ts` | `execute()` | `        if (params.action === "delete") {` (`:58`) | Thêm nhánh `list` **trước** nhánh `delete`, trả về `{ name, description }` của các skill khớp `query`, **không** đọc `SKILL.md`. Dùng `getActiveSkills()` (`extensibility/skills.ts:59`) — không tự quét. |
| `packages/coding-agent/src/autolearn/settings.ts:10-21` | `cfgAutolearnEnabled` | `	id: "autolearn.enabled",`<br>`	type: "boolean",`<br>`	default: false,` | **Cần quyết trước khi gõ.** Nếu `list` phải sống cùng cổng autolearn, cột (2) của cổng hoàn thành là **đúng trên giấy, sai trong thực tế**. Xem bước 3 và Cổng. |
| `packages/coding-agent/src/prompts/tools/manage-skill.md` | prompt model đọc | `- \`action: "create"\` — fails if skill exists.`<br>`- \`action: "update"\` — overwrites body; fails if skill absent.`<br>`- \`action: "delete"\` — fails if skill absent.` | Thêm một bullet `- \`action: "list"\` — returns name + description only; \`query?\` filters. Never returns the body.` (F) |
| `docs/tools/manage_skill.md:21` | bảng `Inputs` + `Flow` bước 2 | `\| \`action\` \| \`"create" \| "update" \| "delete"\` \| Yes \| Managed-skill mutation. \|` | Cập nhật union, đổi `name` thành optional, thêm hàng `query`, thêm một dòng vào `Flow` và một vào `Errors` nếu `list` có thể rỗng. (E) |
| `packages/coding-agent/src/extensibility/skill-descriptions.ts:16` | `MAX_COMPRESSED_WORDS` | `const MAX_COMPRESSED_WORDS = 12;` | **KHÔNG SỬA.** Giữ nguyên `12`. |

---

## 3. CÁC BƯỚC, ĐÁNH SỐ, MỖI BƯỚC CÓ NEO ĐÃ KIỂM

### Bước 0 — Chốt hai quyết định chặn (chưa có trong tài liệu, phải chốt trước bước 1)

1. **Trần nằm ở đâu: hằng hay setting.** `config/registry.ts` là settings registry (xem Mục 0 #2) — một hằng thô ở đó là mồ côi. Tài liệu đã hỏi câu này nhưng mới chỉ dừng ở "hằng hay setting"; câu hỏi thật là **"file nào"**. Đề xuất: hằng ở `extensibility/skill-descriptions.ts` cạnh ba hằng giới hạn đã có.
   *Neo: `packages/coding-agent/src/config/registry.ts:1-4` (`"Settings registry: typed handles for every setting."`) và `:786` (`export function register<...>`).*
2. **`list` sống ở cổng nào.** `manage-skill.ts:52-55` + `autolearn/settings.ts:13` `default: false`. Ba lựa chọn: (i) tách `list` ra khỏi cổng autolearn (thay đổi lớn nhất, nhưng **chỉ lựa chọn này giữ được cổng (2) với người dùng mặc định**); (ii) giữ cổng autolearn và **chấp nhận** rằng với 90% người dùng trần là mất thông tin; (iii) chỉ bật trần khi nào đường tra cứu thực sự tồn tại — trần và cổng trở thành **một** quyết định. **(iii) là lựa chọn đúng** vì nó làm cổng (2) không thể xanh giả.
   *Neo: `packages/coding-agent/src/tools/manage-skill.ts:53` (`if (!cfgAutolearnEnabled.get(session.settings)) return null;`) và `packages/coding-agent/src/autolearn/settings.ts:13` (`	default: false,`).*

### Bước 1 — Chụp baseline byte trước khi sửa gì

Render `system-prompt.md` bằng `buildSystemPrompt` với 5 skill mẫu, lưu output. Đây là cái mà cổng (1) so sánh, và **phải có trước** khi sửa — không phải sau.

*Neo: `packages/coding-agent/test/system-prompt-inventory.test.ts:736-765` — `it("keeps skill URL guidance for a custom declared skill URI reader")` đã dựng sẵn `buildSystemPrompt({ skills: [...], tools, workspaceTree })` rồi join `systemPrompt.join("\n\n")`. Bắt chước đúng khuôn đó.*

### Bước 2 — Viết nhánh phủ định TRƯỚC

Dưới ngưỡng, output phải **giống từng byte**. Điều kiện đặt trước khi code. Chỉ khi `skills.length > CAP` mới cắt.

*Neo: `packages/coding-agent/src/prompts/system/system-prompt.md:28` — `{{#if skills.length}}` bọc cả khối. Cắt tới 0 phần tử là mất luôn dòng `:29` `Matching skill → MUST read \`skill://<name>\` first.` → sàn phải là 1.*

### Bước 3 — Đặt trần ở tầng dữ liệu, không ở template

Sửa `filteredSkills` ở `system-prompt.ts:945-947`, đưa phần bị ẩn vào `data`. **Không** sửa handlebars.

*Neo: `packages/coding-agent/src/system-prompt.ts:945` — `	const filteredSkills = (options.skillDescriptions ?? new SkillDescriptionCatalog()).render(`. Và `packages/utils/src/prompt.ts:461` (`registerHelper("len", …)`) — bộ helper không có cái nào giới hạn `{{#each}}`, nên template không thể tự cắt.*

### Bước 4 — Giữ nguyên `skillful` và `MAX_COMPRESSED_WORDS`

Cả hai **không đụng**. Nhưng đọc `skillful-notice.md` trước để hiểu: nó là **call site `.render()` riêng** ở `agent-session.ts`, không dùng chung `filteredSkills`. Nghĩa là trần của bước 3 **không** áp dụng khi `skillful` bật — và đó là hệ quả, không phải lỗi, nhưng phải nói ra.

*Neo: `packages/coding-agent/src/session/agent-session.ts:9317` — `content: prompt.render(skillfulNoticePrompt, { skills: renderedSkills }),`, với `renderedSkills` tính ở `:9303-9305` từ `this.#skillDescriptions.render(...)`, **tách rời** `system-prompt.ts:945`.*
*Neo: `packages/coding-agent/src/extensibility/skill-descriptions.ts:16` — `const MAX_COMPRESSED_WORDS = 12;` — đọc, không sửa.*

### Bước 5 — Thêm action `list`

Nửa này **quan trọng hơn** nửa trần. Ba sửa cùng lúc trong `manage-skill.ts`: union `action`, `name` thành tuỳ chọn, `.narrow()` nới ra. Rồi thêm nhánh `execute` trả `{ name, description }` — **không** đọc `SKILL.md`.

*Neo: `packages/coding-agent/src/tools/manage-skill.ts:17` — `	action: "'create' \| 'update' \| 'delete'",` (đúng byte, đã verify).*
*Neo: `packages/coding-agent/src/tools/manage-skill.ts:18` — `    name: type("string").describe("kebab-case skill name"),` — bắt buộc, phải thành `"name?"`.*
*Neo: `packages/coding-agent/src/tools/manage-skill.ts:24-25` — `        p.action === "delete" ||` và `        (p.description !== undefined && p.body !== undefined) ||` — nhánh `list` phải thoát trước mệnh đề thứ hai.*
*Neo: `packages/coding-agent/src/tools/manage-skill.ts:27-30` — comment: *"Kept as a cross-field narrow (not a discriminated union) so the wire schema stays a single root object — strict structured-output mode and the Anthropic tool-schema builder both require that."* — ràng buộc cứng, không được phá.*
*Neo: `packages/coding-agent/src/tools/manage-skill.ts:46` — `    readonly strict = true;` — strict structured-output nghĩa là schema mới phải vẫn là một root object.*
*Neo: `packages/coding-agent/src/tools/manage-skill.ts:58` — `        if (params.action === "delete") {` — chèn nhánh `list` trước chỗ này.*
*Nguồn dữ liệu, không tự quét: `packages/coding-agent/src/extensibility/skills.ts:59` — `export function getActiveSkills(): readonly Skill[] {`.*

### Bước 6 — Sửa hai bản mô tả

*Neo: `packages/coding-agent/src/prompts/tools/manage-skill.md:6` — `` - `action: "create"` — fails if skill exists. `` (prompt model đọc; `:7` update, `:8` delete).*
*Neo: `docs/tools/manage_skill.md:21` — `| \`action\` \| \`"create" \| "update" \| "delete"\` \| Yes \| Managed-skill mutation. |`, và `Flow` bước 2 ngay dưới.*

---

## 4. HỢP ĐỒNG TEST

### File: `packages/coding-agent/test/skill-prompt-cap.test.ts` (mới)

**Case 1 — Dưới trần, output giống từng byte.** `skills` = 5 mẫu, `CAP` = 20. So sánh **chuỗi render** với baseline chụp ở bước 1 — `toBe`, không phải `toContain`. Đây là nhánh phủ định bắt buộc.
> **Người dùng thấy gì nếu hồi quy:** không thấy gì. Đó là chính vấn đề — một refactor "thêm giới hạn" chỉ-đổi-hình-dạng sẽ xanh ở mọi nơi và không đến với ai. Case này là thứ duy nhất ngăn được điều đó.

**Case 2 — Vượt trần, phần bị ẩn được nói ra, không biến mất im lặng.** `skills` = 25 mẫu, `CAP` = 20. Render: đúng 20 dòng `- <name>: <desc>`, **và** một dòng báo đếm phần bị ẩn. Không được phép trả về 20 dòng rồi im.
> **Người dùng thấy gì nếu hồi quy:** model không hề biết mình đang nhìn một danh sách bị cắt, nên nó dám kết luận "không có skill nào cho việc này" và bỏ qua một skill có thật.

**Case 3 — Sàn của trần.** `skills` = 0 và 1, `CAP` = 20. Dòng `Matching skill → MUST read \`skill://<name>\` first.` phải còn.
> **Người dùng thấy gì nếu hồi quy:** session không có skill nào mất luôn hướng dẫn `skill://`, và model biến thành mù đường dẫn nội bộ.

**Case 4 — Thứ tự khai báo được giữ.** 25 skill, `CAP` = 20: 20 dòng đầu theo đúng thứ tự đầu vào, không sắp xếp lại.
> **Người dùng thấy gì nếu hồi quy:** skill được load đầu tiên (thường là skill của chính dự án) biến mất khỏi prompt — đúng cái người dùng cần nhất thì bị cắt.

### File: `packages/coding-agent/test/manage-skill-list.test.ts` (mới)

**Case 5 — `action: "list"` trả tên + description và không nạp body.** Kiểm **cả ba**: text chứa tên, text chứa description, và text **không** chứa một đoạn nào của `SKILL.md` body (body mồi: một chuỗi sentinel).
> **Người dùng thấy gì nếu hồi quy:** lệnh tra cứu nuốt context nhiều hơn cả danh sách gốc — và cái trần vừa tiết kiệm lại bị trả hết.

**Case 6 — `query?` lọc, thiếu `query` trả tất cả.** Hai lời gọi: `list` trần, và `list` với `query` chỉ khớp một skill. Khớp không phải tiền tố thì phải trả rỗng, không phải trả tất cả.
> **Người dùng thấy gì nếu hồi quy:** `query` thành trang trí — lọc sai thì model nhận lại toàn bộ danh sách và tự lọc bằng mắt, tức là đúng cái trần định tránh.

**Case 7 — Schema từ chối `list` thiếu `query` một cách im lặng, và vẫn là một root object.** `action: "list"` không kèm `name` phải hợp lệ; `action: "create"` thiếu `description` vẫn phải bị `.narrow()` chặn.
> **Người dùng thấy gì nếu hồi quy:** phản hồi lỗi tool thay vì kết quả — và ở provider strict, một schema không phải single root object làm **hỏng cả lượt gọi model**, không phải một lời gọi.

### File sửa thêm (không thêm case mới)

`packages/coding-agent/test/skillful-toggle.test.ts` — giữ nguyên phần chứng minh `skillful` vẫn liệt kê **tất cả**, kể cả khi trần đang bật. Đây là cách khóa cổng (3) bằng hành vi, không bằng lời.

---

## 5. CỔNG

### Lệnh

```bash
# 0 — đọc trước khi gõ (đường dẫn ĐÚNG, khác với tài liệu)
sed -n '28,35p' packages/coding-agent/src/prompts/system/system-prompt.md
sed -n '16,32p' packages/coding-agent/src/tools/manage-skill.ts
sed -n '10,21p' packages/coding-agent/src/autolearn/settings.ts
sed -n '14,17p' packages/coding-agent/src/extensibility/skill-descriptions.ts

# 1 — type + lint + format
bun run check:ts

# 2 — test
bun test packages/coding-agent/test/skill-prompt-cap.test.ts \
          packages/coding-agent/test/manage-skill-list.test.ts \
          packages/coding-agent/test/skillful-toggle.test.ts \
          packages/coding-agent/test/system-prompt-inventory.test.ts

# TUYỆT ĐỐI KHÔNG: npx tsc / bunx tsc
```

`bun test` **đang chạy được** — addon native đã build (`packages/natives/native/pi_natives.darwin-arm64.node`). Tuyên bố "bị chặn cho tới khi có native addon" trong tài liệu **đã hết hạn**; đừng viết lại vào PR.

### Cổng này có ĐỎ ĐƯỢC không?

| Cổng | Đỏ được? | Bằng cách nào — hoặc vì sao không |
|---|---|---|
| **G1. Dưới trần, output giống từng byte với HEAD** | **CÓ — mạnh** | `toBe` trên chuỗi render đầy đủ, so với baseline chụp từ cây trước khi sửa. Đỏ khi: ai đó dùng `slice(0, N)` vô điều kiện, thêm dòng trống, hoặc đổi whitespace trong `system-prompt.md:28-35`. Đỏ trên **mọi** lần refactor template, đúng như ý đồ. |
| **G2. Danh sách vẫn tra cứu được** | **CÓ — nhưng chỉ khi bước 0-2 đã giải quyết cổng autolearn** | Case 5 + 6 đỏ khi `list` rỗng, khi trả body, khi `query` không lọc. **Nhưng** nếu `list` vẫn nằm sau `cfgAutolearnEnabled` (mặc định `false`), case 5-6 vẫn xanh trong khi người dùng thật vẫn không có tool. **Vì vậy G2 phải có thêm một case: tool phải xuất hiện ở `createTools()` với `autolearn.enabled = false`.** Không có case đó thì G2 là một cổng luôn xanh — tệ hơn không có cổng. |
| **G3. `MAX_COMPRESSED_WORDS = 12` còn nguyên** | **KHÔNG — bằng cách nào cũng không** | `skill-descriptions.test.ts` có 3 test, **không test hằng này**. Không có assertion nào đỏ khi ai đó đổng `12` thành `8`. Đây đúng là loại cổng "luôn xanh tạo cảm giác an toàn giả" mà luật của phiếu cấm. **Viết lại:** thêm vào `skill-descriptions.test.ts` một case giữ `previewSkillDescription` trả nguyên vẹn một description **dài hơn 12 từ** khi compressor trả về thứ dài hơn 12 từ — tức là chứng minh bằng hành vi rằng hằng còn tác dụng, không bằng cách đọc hằng. |
| **G4. Cơ chế chuyển khối `skillful` còn nguyên** | **CÓ** | `skillful-toggle.test.ts` đã tồn tại và đã kiểm hành vi chuyển khối. Thêm một assertion: bật trần + bật `skillful` → notice **vẫn** liệt kê đủ. Đỏ khi ai đó "tiện tay" dọn luôn notice. |
| **G5. Không port ranker** | **KHÔNG — và không nên có** | Không có cách nào làm một cổng *vắng mặt* đỏ. Đây là hướng dẫn review, không phải gate. Ghi vào checklist review, không ghi vào cổng. |

**Kết luận cổng:** G1, G2 (có điều kiện), G4 đỏ được. **G3 không đỏ được vì không có test nào chạm nó** — đã viết lại ở trên. G5 không phải gate. Nếu bước 0-2 chưa quyết cổng autolearn thì **G2 phải bị gỡ khỏi danh sách cổng cho tới khi quyết xong** — đừng để nó xanh.

---

## 6. CẠM BẪY RIÊNG CỦA WORK ITEM NÀY

Xếp theo mức phá hỏng thật sự.

**1. Cổng autolearn — cái bẫy lớn nhất, và tài liệu không hề nhắc tới.**
`manage-skill.ts:53` `if (!cfgAutolearnEnabled.get(session.settings)) return null;` và `autolearn/settings.ts:13` `default: false`. Nửa `list` mà tài liệu gọi là "**quan trọng hơn** nửa trần" **không tồn tại với người dùng mặc định**. Làm đúng theo tài liệu → trần chạy, đường tra cứu không chạy, mọi thứ dưới trần là mất thông tin thật, và cổng (2) vẫn xanh vì test chỉ gọi tool trực tiếp chứ không kiểm nó được đăng ký. Phải quyết ở bước 0, trước khi viết dòng schema đầu tiên.

**2. Nghĩ trần thuộc về template, rồi đặt nó sai chỗ và không cắt được.**
Tài liệu liệt kê `system-prompt.md` là file **sửa** đầu tiên. Nhưng template không có helper giới hạn `{{#each}}` (`packages/utils/src/prompt.ts` chỉ có `arg, join, default, ifAny, ifAll, codeblock, xml, escapeXml, len, add, sub, includes, not, jsonStringify`). Người gõ sẽ mở file, thử `{{#each skills limit=20}}` (Handlebars không có), rồi hoặc tự đăng ký một helper (vi phạm "không nhân bản tiện ích" và đụng file dùng chung) hoặc bỏ mặc. Chỗ đúng là `system-prompt.ts:945`, cạnh chỗ `filteredSkills` được dựng.

**3. Tưởng trần áp dụng cả cho `skillful`, hoặc tưởng nó là một cơ chế duy nhất.**
Hai call site `.render()` **hoàn toàn tách rời**: `system-prompt.ts:945` cho system prompt, và `agent-session.ts:9303-9317` cho notice. Đặt trần ở một chỗ không đụng chỗ kia. Kết quả: khi `skillful` bật, khối `<skills>` biến mất khỏi system prompt nhưng lại hiện nguyên vẹn trong notice — **không tiết kiệm token nào**, và người đọc PR tưởng đã xong. Muốn trần có nghĩa thì phải cắt ở **cả hai**, và phải nói ra trong changelog là ở chế độ nào.

**4. Thêm action `list` mà phá `strict = true`.**
`manage-skill.ts:46` `readonly strict = true;` và comment `:27-30` nói thẳng schema phải là **một root object** vì strict structured-output mode và Anthropic tool-schema builder cần điều đó. Bản năng tự nhiên khi thêm action thứ tư là viết discriminated union — `type({ action: type("'create'..."), ...})` chia nhánh. Làm vậy là **hỏng lượt gọi model**, không phải một lời gọi hỏng. Ngoài ra `name` đang bắt buộc ở `:18` — quên đổi thành `"name?"` thì `list` không bao giờ chạy được.

**5. Đổng `MAX_COMPRESSED_WORDS` cho "rẻ" — cách sai tài liệu đã cảnh báo, nhưng thêm một lý do nữa.**
Không chỉ "nén chứ không chọn". Nó còn là **cổng từ chối** (`:95`): bản nén dài hơn 12 từ bị vứt và lùi về `previewSkillDescription`. Hạ `12` xuống `6` làm **mọi** bản nén LLM thất bại và description luôn rơi về bản preview dài — tức làm prompt **dài hơn**, đúng ngược mục tiêu. Đây là cách sai duy nhất mà hành động sai **giảm** hiệu quả mong muốn thay vì chỉ vô dụng.

**6. Tin con số của tài liệu về codex.**
`dynamic_skill_selector/` là **20 file / 2.703 dòng**, không phải 87 file / 22.712 dòng (con số đó thuộc cả crate `ext/skills`). Lập luận "đừng port" vẫn đúng, nhưng nếu bạn viết "chúng ta tránh được 22.712 dòng" trong PR thì bất kỳ ai mở codex đều thấy sai ngay, và toàn bộ phần cảnh báo mất độ tin cậy. Viết lại thành: *khoảng 2.700 dòng Rust cho 10 biến thể chọn, tồn tại để so sánh chúng với nhau — công việc nghiên cứu, không phải kết quả.*

**7. Dùng lại lệnh `git grep` làm bằng chứng.**
Lệnh trong tài liệu trả về **44 file**, không phải 1. Kết luận vẫn đúng (không có ranker skill nào), nhưng đưa "chỉ trúng `crates/pi-predict`" vào commit message là một khẳng định đo sai mà review có thể bắt được. Bỏ câu đó, hoặc chạy lại và dán con số thật.

**8. Cắt tới 0 là mất luôn hướng dẫn `skill://`.**
`system-prompt.md:28` `{{#if skills.length}}` bọc **cả** khối, kể cả dòng `:29`. Một trần cho phép 0 phần tử là xoá luôn câu "MUST read `skill://<name>` first" — model mất đường vào skills mà không có gì báo. Sàn phải là 1, và cần một case test riêng cho nó.
