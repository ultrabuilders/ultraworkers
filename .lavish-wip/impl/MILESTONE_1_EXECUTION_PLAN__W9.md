# PHIẾU TRIỂN KHAI — W9. Attribution usage theo model, bucket `Tools/summaries`, cộng chi phí cache-miss

Kế hoạch: `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1_EXECUTION_PLAN.md` §W9 (dòng 1857–2081).
HEAD đã kiểm: `65cc6c1` trên `milestone-1` (plan ghi `ecd516f` — **đã cũ**, xem Mục 7).

---

## 1. Cái gì thay đổi, quan sát được

`/info` mọc thêm một mục **Attribution** ngay dưới khối `Cost`, in từng model đã thực sự phục vụ token kèm `totalTokens` và cost của nó (sắp cost giảm dần), thêm một dòng literal `Tools/summaries` gom mọi lượt gọi do tiến trình tự khởi xướng (compaction, auto-thinking, cache-warm, judgment, kết quả tool `task`), và thêm một dòng `Cache misses` báo số token bị trả lại ở giá cache-read cùng số tiền tương ứng; `/usage` ở chế độ text của ACP in cùng khối per-model đó ngay trên dòng `Cost: $...` — nên người dùng đổi model giữa phiên cuối cuối cũng thấy được model nào đang thực sự đốt tiền và tiến trình đã tốn bao nhiêu để tóm tắt ngữ cảnh của họ.

---

## 2. Bảng điểm sửa

| đường/dẫn | symbol / hàm | TRƯỚC (trích từ file thật) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/coding-agent/src/session/usage-breakdown.ts` | — (file mới) | *không tồn tại* (`ls` → No such file or directory) | Module thuần: `TOOLS_SUMMARIES_BUCKET = "Tools/summaries"`, `NOISE_FLOOR_TOKENS = 2048`, `CACHE_ATTRIBUTION_WINDOW_MS = 5 * 60_000`; kiểu `UsageBucket`, `CacheMissCost`, `UsageBreakdown`; hàm export duy nhất `buildUsageBreakdown(input)`. Không `Date.now()`, không gọi registry/session-manager; `nowMs` do caller truyền. |
| `packages/coding-agent/src/session/agent-session-types.ts` | `export interface SessionStats` (`:472–498`) | `:496  routedModels?: Record<string, number>;`<br>`:497  contextUsage?: ContextUsage;`<br>`:498 }` | thêm `usageBreakdown?: UsageBreakdown;` ngay **trước** dòng 498, cùng doc kiểu `/** Per-model cost attribution; absent when no turn has been served yet. */`. **Optional** — xem Mục 6, cạm bẫy #1. |
| `packages/coding-agent/src/session/session-stats.ts` | `SessionStatsTracker.getSessionStats()` (`:114–204`) | `:133  const addUsage = (usage: Usage): void => {`<br>`:150  for (const message of state.messages) {`<br>`:173  for (const entry of activeModelUsageEntries(this.#host.sessionManager.getBranch())) addUsage(entry.usage);`<br>`:201  ...(Object.keys(routedModels).length > 0 ? { routedModels } : undefined),`<br>`:202  contextUsage: this.getContextUsage(),` | `:174  const usageBreakdown = buildUsageBreakdown({ messages: state.messages, branch, transcript, cacheReadRatePerMillion, nowMs });`<br>`:201  ...(Object.keys(routedModels).length > 0 ? { routedModels } : undefined),`<br>`:202  ...(usageBreakdown.rows.length > 0 ? { usageBreakdown } : undefined),` — đặt **cạnh** `contextUsage`, **không** chạm vào bất kỳ dòng cộng phẳng nào. |
| `packages/coding-agent/src/modes/controllers/command-controller.ts` | `handleSessionCommand()` (`:349`), sau khối `Cost` (`:415–428`) | `:428  }` ← đóng khối Cost<br>`:429` (trống)<br>`:430  if (this.ctx.lspServers && this.ctx.lspServers.length > 0) {` | Chèn mục Attribution giữa dòng 429 và 430. Mẫu render bám sẵn ở `:383`: `` `${replaceTabs(sanitizeText(id))}` ``. `sanitizeText` đã import ở `:14`, `replaceTabs` ở `:68` — **không thêm import**. |
| `packages/coding-agent/src/slash-commands/helpers/usage-report.ts` | `buildUsageReportText()` (`:167–202`), nhánh fallback (`:189–201`) | `:200  \`Cost: $${stats.cost.toFixed(6)}\`,`<br>`:201  ].join("\n");` | `:200  \`Cost: $${stats.cost.toFixed(6)}\`,`<br>thêm `...perModelLines,` vào mảng trả về. `sanitizeText` đã import ở `:2`. Nhánh provider-reported (`:172–187`) **giữ nguyên**, thêm comment một dòng. |
| `packages/coding-agent/CHANGELOG.md` | `## [Unreleased]` (`:3`) | `:3  ## [Unreleased]`<br>`:4` (trống)<br>`:5  ### Security` | Chèn `### Added` giữa dòng 4 và 5, rồi một bullet. **Hiện `[Unreleased]` KHÔNG có `### Added`** — phải tạo mới, không phải thêm vào section có sẵn. |
| `packages/coding-agent/test/usage-breakdown.test.ts` | — (file mới) | *không tồn tại* | 4 test hợp đồng, xem Mục 4. |
| `packages/coding-agent/test/session-manager/usage-statistics.test.ts` | không sửa | `describe("SessionManager usage statistics", ...)` | chạy lại làm hộ canh. Đã chạy ở HEAD: **7 pass, 0 fail**. |

---

## 3. Các bước (mỗi bước có neo đã kiểm)

### Bước 1 — Chốt baseline

```bash
cd /Users/tranquangdang21/Projects/ultraworkers && bun run check:ts
```

- `package.json:90` → `"check:ts": "bun run check:tools && bun run --filter './packages/*' --sequential --if-present check:types"`
- `package.json:91` → `"check:tools": "oxlint . && oxfmt --check ..."`
- `packages/coding-agent/package.json:523` → `"check:types": "tsgo -p tsconfig.json --noEmit"`

Nếu đỏ, xác nhận file báo lỗi không phải do bạn tạo. Cây làm việc dùng chung với worker milestone-1 khác.

### Bước 2 — Tạo `usage-breakdown.ts`

Ba hằng số + ba kiểu + **một** hàm export `buildUsageBreakdown(input)`. Thuần, chỉ-đọc, không `Date.now()` — caller truyền `nowMs`. Tra giá phải là tham số tiêm vào (`cacheReadRatePerMillion: (provider, modelId) => number | undefined`) để test được mà không cần `ModelRegistry`.

Hằng số, dùng giá trị này và **không import từ chỗ plan ám chỉ** (xem Mục 7, neo #19):

```ts
export const TOOLS_SUMMARIES_BUCKET = "Tools/summaries";
// 2048 khớp MIN_CACHE_FOOTPRINT của repo (packages/tui/src/chat/cache-invalidation-marker.ts:12)
export const NOISE_FLOOR_TOKENS = 2048;
// 5 phút là TTL cache của Anthropic; KHÔNG có hằng số nào mang tên này trong repo
export const CACHE_ATTRIBUTION_WINDOW_MS = 5 * 60_000;
```

### Bước 3 — Lớp một: bucket per-model, sao đúng lượt đi sẵn có

`getSessionStats()` **đã** làm lượt đi ba nguồn. Sao nó, đừng bịa lượt đi mới. Ba nguồn, mỗi nguồn vào **đúng một** bucket:

- **(a) assistant message** → bucket `${msg.provider}/${msg.upstreamModel ?? msg.model}`.
  *Neo: `session-stats.ts:159–170`. Sự thật mà plan nói đúng: `session-stats.ts:168` đọc `message.upstreamModel`, `session-stats.ts:166` `if (!usage) continue;` — một assistant không có `usage` không đóng góp gì cả.*
- **(b) tool result `task`** → bucket `Tools/summaries`, đọc usage qua đúng `taskToolUsage`.
  *Neo: `session-stats.ts:155–158` (điều kiện `message.toolName === "task"`), `session-stats.ts:422–426` (`taskToolUsage` thật sự), `session-stats.ts:428–438` (`isUsage` thật sự).*
- **(c) entry `model_usage` trên branch đang hoạt động** → bucket `Tools/summaries`.
  *Neo: `session-stats.ts:173` + `session-stats.ts:63–76` (`activeModelUsageEntries`).*

Chỉ tăng `turns` cho nguồn (a). Cộng `input/output/cacheRead/cacheWrite/totalTokens/cost` bằng **đúng** các field mà `addUsage` hiện có đọc, để hai bộ cộng không trôi lệch:

*Neo: `session-stats.ts:133–149`. Trích nguyên văn:*
```
134: totalInput += usage.input;
135: totalOutput += usage.output;
136: totalReasoning += usage.reasoningTokens ?? 0;
137: totalCacheRead += usage.cacheRead;
138: totalCacheWrite += usage.cacheWrite;
139: totalTokens += usage.totalTokens;
140: totalPremiumRequests += usage.premiumRequests ?? 0;
141: totalCost += usage.cost.total;
```

### Bước 4 — Lọc và sắp

`.filter(e => e.cost > 0 || e.totalTokens > 0).sort((a, b) => b.cost - a.cost)`, hoà thì bẻ theo `key` tăng dần. Giữ `Tools/summaries` trong danh sách — nó là dòng ngang hàng, không phải footer.

### Bước 5 — Lớp hai: tổng cache-miss đã định giá

Duyệt assistant message theo thứ tự. Với mỗi cái **chưa** được giải thích, tính `idleMs` = khoảng trống từ `completedAt ?? timestamp` của assistant trước tới `timestamp` của message này.

Một miss chỉ được tính khi **TẤT CẢ** đúng:
1. `transcript.cacheMissExplainedAt[i] !== true`
2. `cacheRead === 0` ở lượt này
3. `reprocessedTokens = cacheWrite + input > 0`
4. `reprocessedTokens >= NOISE_FLOOR_TOKENS`
5. `idleMs >= CACHE_ATTRIBUTION_WINDOW_MS` **hoặc** có đổi model đứng trước

Rồi `missedTokens += reprocessedTokens` và
`missedCost += reprocessedTokens / 1_000_000 * rate` — **phép chia là bắt buộc**.

*Neo rate là per-million: `packages/catalog/src/types.ts:1116–1122`, trích nguyên văn:*
```
1116: /** Per-million-token rates for one model pricing tier. */
1117: export interface TokenCost {
1120: 	cacheRead: number;
```
Còn `Usage.cost.*` đã là dollar. Tra giá trả `undefined` → cộng token, **không** cộng cost.

*Nguồn `cacheMissExplainedAt`: `packages/coding-agent/src/session/session-context.ts:117` (field trên interface transcript, doc: "Only populated in transcript mode"), khai báo mảng ở `:345`, push ở `:377`. Sử dụng mẫu: `packages/coding-agent/src/modes/utils/ui-helpers.ts:509` — `sessionContext.cacheMissExplainedAt?.[i] ?? false`.*

**Consumer phải coi mảng là có-thể-vắng-mặt** và song song chỉ số với `transcript.messages`. Lý do đã kiểm: `session-context.ts:376` là `if (!options?.transcript) return;` — ngoài chế độ transcript, mảng không bao giờ được đẩy; và `session-context.ts:577` là call site thứ hai của `trackMessageCacheState` (assistant ẩn trước compaction), nên mảng được ghi trên đường **không** đi qua `pushMessage` → **độ dài mảng có thể ≠ độ dài `messages`**. Dùng `?.[i]` và kiểm tra `undefined`, đừng `!` index.

### Bước 6 — Tín hiệu model-change DÍNH (nhánh dễ sai nhất)

Đừng đọc thẳng boolean ra từ `trackMessageCacheState`. Thay vào đó:

- `providerReportsCaching = true` **ngay khi BẤT KỲ** lượt nào trong phiên có `cacheRead > 0 || cacheWrite > 0`;
- chỉ khi nó còn `false`, một đổi model mới giải thích được một miss;
- ghi `modelChanged` theo từng miss đóng góp, rồi OR lại cho tổng.

Đây chính là thứ phân biệt provider chỉ-đọc-cache (OpenAI: báo `cacheRead`, không bao giờ báo `cacheWrite`) với provider không báo cache gì.

*Lập luận này đã có sẵn trong repo — đọc trước khi viết: `packages/tui/src/chat/cache-invalidation-marker.ts:49–63`. Trích `:62`: `if (current.cacheWrite <= 0) return undefined;` với doc ở `:40–47` giải thích vì sao provider implicit-cache báo `cacheWrite` bằng 0. `MIN_CACHE_FOOTPRINT = 2048` ở `:12`; chặn sau lượt ấm ở `:55`.*

### Bước 7 — Nối bộ cộng vào session stats

Thêm `usageBreakdown?: UsageBreakdown` vào `SessionStats` — **optional**.

*Neo: `packages/coding-agent/src/session/agent-session-types.ts:472–498` (đọc trực tiếp; plan ghi 451–477, xem Mục 7). Nhánh `routedModels?` hiện có ở `:496` là mẫu optional sẵn có để bắt chước.*

Tính bên trong `SessionStatsTracker` sau lượt đi hiện có, tái dùng `state.messages` + `sessionManager.getBranch()` đã gom. Để khối Attribution và tổng phẳng chứng minh được là cùng đi một lượt.

*`branch` đã có sẵn trong scope: `session-stats.ts:173` gọi `this.#host.sessionManager.getBranch()`.*

### Bước 8 — Render mục Attribution trong `/info`

Chèn **sau** khối `Cost`, tức làm giữa dòng 429 (trống) và dòng 430 (`if (this.ctx.lspServers ...)`). Khối `Cost` kết thúc ở **dòng 428** (`}` đóng `if` từ dòng 415), **không phải 431** như plan ghi (xem Mục 7, neo #12).

Mỗi dòng: key, `totalTokens`, cost làm tròn 4 chữ số thập phân — khớp `stats.cost.toFixed(4)` sẵn có.

*Neo render mẫu — `command-controller.ts:379–386`, trích nguyên văn:*
```
380: const routed = Object.entries(stats.routedModels)
381: 	.sort(([aId, aCount], [bId, bCount]) => bCount - aCount || aId.localeCompare(bId))
383: 			([id, count]) => `${replaceTabs(sanitizeText(id))}${count > 1 ? theme.fg("dim", ` ×${count}`) : ""}`,
```
Sanitize key đúng bằng `replaceTabs(sanitizeText(key))` trước khi nội suy. Rồi một dòng `Cache misses:` với `missedTokens` và `missedCost.toFixed(4)`, **bỏ hẳn** dòng khi `missedTokens === 0`. Bỏ qua toàn bộ mục khi không có dòng nào.

### Bước 9 — Khối per-model trong text path của `/usage`

Chỉ ở **nhánh fallback local-tallies**, sau dòng `Cost: $...` sẵn có.

*`packages/coding-agent/src/slash-commands/helpers/usage-report.ts`, trích nguyên văn:*
```
189: const stats = runtime.session.sessionManager.getUsageStatistics();
191: return [
200: 	`Cost: $${stats.cost.toFixed(6)}`,
201: ].join("\n");
```
Nhánh này là chuỗi thuần đã TUI-sanitize, không phải overlay có theme → dùng dòng thuần, chạy model key qua `sanitizeText` (đã import ở `usage-report.ts:2`).

Nhánh provider-reported (`:172–187`) giữ nguyên, thêm một dòng comment nói rõ lý do: nó không có dữ liệu per-model theo bản chất.

`buildUsageReportText` là export **duy nhất** của file — đã xác nhận: `rg -n '^export'` trả về đúng một dòng, `167:export async function buildUsageReportText(...)`. File dài 202 dòng. Không thêm bề mặt export mới.

**Cảnh báo Mục 6, cạm bẫy #2:** nhánh này lấy số từ `getUsageStatistics()`, **không phải** `getSessionStats()`. Xem bước 10.

### Bước 10 — Viết test

`packages/coding-agent/test/usage-breakdown.test.ts`. Dùng `SessionManager.inMemory()` + `appendMessage` / `appendModelUsage` / `buildSessionContext()` làm seam.

*Mẫu fixture có sẵn — `packages/coding-agent/test/session-manager/usage-statistics.test.ts:1–35`, trích nguyên văn:*
```ts
const modelUsage = {
	purpose: "auto-thinking",
	role: "smol",
	api: "anthropic-messages",
	provider: "anthropic",
	model: "claude-haiku-4-5",
	stopReason: "stop",
	usage: { input: 11, output: 2, cacheRead: 3, cacheWrite: 0, totalTokens: 16,
		cost: { input: 0.0011, output: 0.0004, cacheRead: 0.00003, cacheWrite: 0, total: 0.00153 } },
} as const;
```

Bốn nhánh khác nhau, mỗi assert đặt tên một kết quả người dùng thấy được:

1. **Phép bằng.** Hai model + một compaction → tổng cost các dòng **bằng** `getSessionStats().cost` phẳng, VÀ usage của compaction nằm trong `Tools/summaries` và **không** nằm ở dòng model nào.
2. **Provider alias.** Một assistant message có `upstreamModel` khác `model` được quy cho served id.
3. **Cache miss.** Miss do idle thật → `missedTokens > 0` với `missedCost === missedTokens / 1e6 * rate`; miss dưới noise floor → **đúng** 0 và 0.
4. **Phân biệt dính.** Provider đã báo `cacheRead` ấm ở lượt trước rồi lạnh sau **không** bị quy cho đổi model; provider không lượt nào báo cả `cacheRead` lẫn `cacheWrite` thì **vẫn** bị quy.

**KHÔNG** assert vào câu chữ/label của prompt, và **KHÔNG** assert vào `getUsageStatistics()` — xét kỹ Mục 6, cạm bẫy #2.

### Bước 11 — Chạy lại hộ canh

```bash
bun test packages/coding-agent/test/session-manager/usage-statistics.test.ts
```

Nó ghim đúng những tổng phẳng mà refactor bước 7 đụng tới. **Đã chạy ở HEAD: 7 pass, 0 fail, 18 expect() calls, 606ms.** Native addon **đã** build sẵn (`packages/natives/native/pi_natives.darwin-arm64.node`, 185 MB) — không cần chạy `bun --cwd=packages/natives run build`, và `ninja` đã có ở `/opt/homebrew/bin/ninja`. Các bước chuẩn bị mà plan liệt kê là **thừa** với cây hiện tại.

### Bước 12 — CHANGELOG

`packages/coding-agent/CHANGELOG.md`, dưới `## [Unreleased]` (dòng 3). **Hiện `[Unreleased]` chỉ có `### Security` ở dòng 5 — phải tạo `### Added` mới**, không phải thêm vào section có sẵn. Nội dung:

> `/info` now breaks down token cost by the model that actually served each turn, separates internal summarization into a `Tools/summaries` row, and reports the dollar cost of prompt-cache misses.

Đây là thay đổi nội bộ không có issue link → dùng câu thuần, theo AGENTS.md.

---

## 4. Hợp đồng test

**File:** `packages/coding-agent/test/usage-breakdown.test.ts` (tạo mới) + `packages/coding-agent/test/session-manager/usage-statistics.test.ts` (đã có, chạy lại).

| # | Test | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- |
| 1 | Các dòng per-model + `Tools/summaries` cộng **CHÍNH XÁC** bằng tổng phẳng | Mục Attribution cộng lại **lớn hơn** dòng `Cost: Total` đang nhìn — một cách vô lý số học mà UI làm nổi bật |
| 2 | Entry `model_usage` rơi vào `Tools/summaries` và **không** rơi vào dòng model nào | Một model bị quy cho chi phí mà nó không hề phục vụ |
| 3 | `upstreamModel` khác `model` → quy cho served id | Hàng của một model gateway bị ghi đè bằng id mà người dùng đã gõ |
| 4 | Miss dưới noise floor → `missedTokens === 0` **và** `missedCost === 0` | Dòng `Cache misses` hiện ra một con số tiền từ hư không |

Bốn nhánh khác nhau, không dòng trùng nhau. Không assert câu chữ/label.

---

## 5. Cổng

### Cổng 1 — `bun run check:ts` (từ repo root)

oxlint + oxfmt + `tsgo --noEmit` trên mọi package. Bắt được lỗi kiểu mà `bun test` không thấy.

### Cổng 2 — `bun test` trên hai file

```bash
bun test packages/coding-agent/test/usage-breakdown.test.ts \
          packages/coding-agent/test/session-manager/usage-statistics.test.ts
```

### Cổng này có ĐỎ ĐƯỢC không, bằng cách nào?

**Có — và tôi đã chạy thử để biết chắc, không phải suy đoán.**

Cổng 1 đỏ đúng khi: thêm field không optional phá vỡ một object literal; `buildUsageBreakdown` được gọi với sai kiểu; import sai đường dẫn. Baseline của cổng 1 **là thật** — `tsgo --noEmit` là kiểm kiểu thật, không phải nền đỏ có sẵn.

Cổng 2 đỏ đúng khi:

| Hành vi sai | Test nào đỏ | Vì sao đỏ |
| --- | --- | --- |
| Một entry `model_usage` bị cộng vào cả dòng model lẫn `Tools/summaries` | test 1 | `sum(rows.cost) > stats.cost` |
| Bỏ fallback `upstreamModel`, chỉ dùng `msg.model` | test 3 | bucket key là requested id, không phải served id |
| Không áp noise floor | test 4 | miss 5 token bị tính → `missedCost !== 0` |
| Không cài quy tắc dính | test 4 | hai provider cho cùng một kết quả → không phân biệt được |
| Refactor làm trôi tổng phẳng | `usage-statistics.test.ts` | tổng index lệch |

**Đã xác nhận ở HEAD:** `usage-statistics.test.ts` → **7 pass, 0 fail**. Hộ canh đỏ được, không phải trắng.

### ⚠️ Một lỗ hổng thật của cổng: phép bằng kiểm SAI TỔNG

Đây là điều quan trọng nhất trong phiếu này, và plan **không** nêu.

Có **hai** bộ cộng phẳng khác nhau trong repo, và chúng **không bằng nhau**:

| | `/info` (mục Attribution) | `/usage` (ACP text) |
| --- | --- | --- |
| nguồn | `getSessionStats()` — `session-stats.ts:114–204` | `getUsageStatistics()` — `session-manager.ts:2513–2515` → `#index.usageSnapshot()` |
| phạm vi | `state.messages` + `activeModelUsageEntries(branch)` — **chỉ branch đang hoạt động**, cửa sổ sau compaction/reset gần nhất | mọi entry **từng** ghi vào index, qua cả branch đã bỏ |
| `model_usage` ngoài branch | **không tính** | **vẫn tính** |

`session-manager.ts:475` cộng usage vào `#usage` ngay trong `insert()` cho **mọi** entry, không lọc branch. Còn `session-stats.ts:63–76` cắt branch tại `getLatestCompactionEntry` / `reset_boundary`.

**Tôi đã chạy một probe thật để xác nhận, không phải đọc suông:**

```
ACTIVE branch types: message,message,message
model_usage in ACTIVE branch? false
index getUsageStatistics().cost: 0.5
```

Một `model_usage` được ghi với `parentId` là một message **không nằm trên branch đang hoạt động**: index báo `cost = 0.5`, còn lượt đi của `getSessionStats()` không thấy nó. `usage-statistics.test.ts:36–53` chính là test khẳng định hành vi này — nó gọi `appendModelUsage` với `parentId: ownerParent` rồi `expect(session.getBranch(usageId).at(-1))…`, tức entry nằm ngoài branch chính.

**Hệ quả trực tiếp lên công việc:**

1. **Test 1 phải assert phép bằng với `getSessionStats().cost`, KHÔNG phải `getUsageStatistics().cost`.** Nếu assert sai tổng, hoặc test đỏ vô lý, hoặc tệ hơn — implementer "sửa" cho xanh bằng cách nới bucketing và phá đúng thứ W9 sinh ra.
2. **Bước 9 không thể chỉ dùng `getUsageStatistics()`.** Nhánh `/usage` hiện tại lấy số từ đó. Muốn in khối per-model ở cùng chỗ mà không tự mâu thuẫn, phải lấy `usageBreakdown` từ `runtime.session.getSessionStats()` — `SlashCommandRuntime.session` là `AgentSession` (`packages/coding-agent/src/slash-commands/types.ts:61`), và `AgentSession.getSessionStats()` tồn tại ở `packages/coding-agent/src/session/agent-session.ts:11327–11329`. Nếu in khối per-model (từ `getSessionStats`) cạnh dòng `Cost:` (từ `getUsageStatistics`), người dùng sẽ thấy hai con số **không cộng lên nhau** — đúng cái điều W9 sinh ra để chống.
3. **Đây là lý do cổng phải đỏ được, và vì sao kiểm thủ công trong TUI là bắt buộc, không phải tuỳ chọn.** Kiểu thử không bắt được mâu thuẫn giữa hai tổng; chỉ nhìn `/info` và `/usage` cạnh nhau trong phiên thật mới thấy.

**Kiểm thủ công (bắt buộc):** `/info` phải render mục Attribution **không rỗng** cho một phiên đã dùng hai model cộng một compaction; dòng `Tools/summaries` phải có mặt; tổng cost các dòng phải bằng đúng dòng `Cost: Total` ngay trên màn hình. Mở `/usage` ở cùng phiên và xác nhận khối per-model ở đó **cũng** cộng về tổng của chính nó — không so với tổng của `/info`.

---

## 6. Cạm bẫy riêng của work item này

**1. Bắt buộc/non-bắt buộc — và lý do thật.**
Plan nói `optional` để "fixture object-literal ở `preview-session.ts:43` và `status-line.ts:40` vẫn compile". **Sai.** Đã đọc: `preview-session.ts:43` là `getUsageStatistics: () => ({` và `status-line.ts:40` là `getUsageStatistics: () => ({` — cả hai là **`UsageStatistics`**, không phải `SessionStats`. `rg ': SessionStats\b' --type ts` trong `src/` và `test/` chỉ trả về interface + hai chỗ khai báo kiểu trả về; không có object literal `SessionStats` nào trong repo. Nên **bắt buộc cũng an toàn**. Làm `optional` vẫn đúng (bám `routedModels?` ở `agent-session-types.ts:496`), nhưng đừng tin lý do của plan — và đừng viết comment "optional for gallery fixtures" vào code vì nó sai.

**2. Hai bộ cộng phẳng.** Mục 5. Đây là cạm bẫy chết người của W9: phép bằng ở test 1 là hợp đồng trung tâm, và assert vào tổng sai là cách chắc chắn nhất để tạo ra một hợp đồng trông xanh mà sai.

**3. Đếm hai lần.** Ba nguồn phải mỗi nguồn rơi vào **đúng một** bucket. Đây là lý do tầng hai không có chỗ đúng để đáp nếu tầng một chưa đúng — hai tầng là **một** work item, không phải hai.

**4. Đổi tên field định danh.** Plan nói `responseModel`. Field này **không tồn tại** trên `AssistantMessage`. `rg -n 'responseModel' --type ts` trả về `packages/agent/src/telemetry.ts:1589, 1613, 1621, 1629, 1672, 1716` (thuộc tính span OTel) và `packages/coding-agent/src/judgment/index.ts:96, 271, 277, 441` (một attempt của judgment) — không cái nào là field của `AssistantMessage`. Field mang đúng ý này là `upstreamModel`, `packages/ai/src/types.ts:1118–1125`. Phải là `msg.upstreamModel ?? msg.model`; chỉ dùng `msg.model` sẽ âm thầm quy sai mọi lượt có provider alias.

**5. Sai hình dạng ba điểm vào.** `ToolResultMessage` (`packages/ai/src/types.ts:1166–1186`) **không có** field `usage`; usage chỉ lồng trong `details`, và chỉ tool `task` có. `CompactionEntry` (`packages/coding-agent/src/session/session-entries.ts:120–137`) **không có** field `usage`; usage của compaction/branch-summary nằm ngoài dải, thành `ModelUsageEntry` riêng (`session-entries.ts:80–92`, `type: "model_usage"`), ghi bởi `SessionManager.appendModelUsage()` (`session-manager.ts:2820–2841`). Ba selector phải viết lại đúng như Bước 3. Giá trị `purpose` quan sát được: `"auto-thinking"` (`packages/coding-agent/src/auto-thinking/classifier.ts:144`), `"cache-warm"` / `"cache-warm:extension-override"` (`agent-session.ts:4891`), và các purpose judgment tự do (`judgment/index.ts:77` khai báo, `:121` ghi).

**6. Ba hằng số phải tự định nghĩa.** `NOISE_FLOOR_TOKENS` không tồn tại (`rg` → 0 hit). `CACHE_TTL_MS` không tồn tại. `ANTHROPIC_CACHE_TTL_MS` **không tồn tại** ở bất kỳ đâu trong `packages/` — `rg -rn 'ANTHROPIC_CACHE_TTL_MS' .` chỉ trúng chính các file kế hoạch. Định nghĩa riêng trong `usage-breakdown.ts` và comment nguồn gốc.

**7. `cacheMissExplainedAt` có thể lệch độ dài.** Bước 5. Dùng `?.[i]`, không `![i]`.

**8. Đừng sửa `trackMessageCacheState`.** Nó dùng `${msg.provider}/${msg.model}` thô, không có fallback `upstreamModel` (`session-context.ts:366–367`, đã đọc: `const currentModel = \`${msg.provider}/${msg.model}\`;`). Sửa nó sẽ đổi lượt nào UI đánh dấu là đã-giải-thích — ngoài phạm vi W9. **Báo cáo, đừng sửa.**

**9. Render path phải sanitize.** `replaceTabs(sanitizeText(key))` trước khi nội suy, bám `command-controller.ts:383`. Bỏ qua thì một model id chứa tab phá TUI.

---

## 7. Các neo hỏng — đã kiểm từng cái, sửa ở đây, KHÔNG sửa trong tài liệu

| # | Cites | Nên trỏ tới | Thực tế | Cách tìm |
| --- | --- | --- | --- | --- |
| 1 | `session-stats.ts:114-205` | `getSessionStats()` | `:114–204`. Dòng 204 là `}` đóng hàm; 205 trống. | `awk 'NR>=200 && NR<=206'` |
| 2 | `session-stats.ts:134-151` cho `addUsage` | thân `addUsage` | `:133–149` — khai báo ở 133, `};` ở 149. Dòng 151 là `userMessages++;` thuộc vòng lặp. | `awk 'NR>=130 && NR<=152'` |
| 3 | `session-stats.ts:152-172` cho "lượt đi ba nguồn" | vòng lặp + entry `model_usage` | `:150–173`. Nguồn (c) nằm ở **dòng 173** (`for (const entry of activeModelUsageEntries(...))`), ngoài dải 152–172. | `awk` + đọc |
| 4 | `agent-session-types.ts:451-477` | `export interface SessionStats` | **`:472–498`**. Lệch 21 dòng. | `rg -n 'export interface SessionStats'` → 472 |
| 5 | `session-entries.ts:121+` cho `CompactionEntry` | `CompactionEntry` | `:120–137` — `export interface CompactionEntry` ở dòng **120**, không phải 121. | `rg -n 'export interface CompactionEntry'` |
| 6 | `session-entries.ts:80-91` cho `ModelUsageEntry` | `ModelUsageEntry` | `:80–92` — đóng ở 92. | `awk 'NR>=80 && NR<=92'` |
| 7 | `session-entries.ts:80-91` nói mang `purpose, role, api, provider, model, usage, stopReason` | — | Đúng về field, nhưng **thiếu `errorMessage?: string`** ở dòng 91. | `awk` |
| 8 | `session-manager.ts:2820-2839` | `appendModelUsage` | `:2820–2841` — `return entry.id;` ở 2840, `}` ở 2841. | `awk 'NR>=2836 && NR<=2843'` |
| 9 | `session-context.ts:727` "chỗ gán khi return" | gán `cacheMissExplainedAt` khi return | **`:741`**: `cacheMissExplainedAt: options?.transcript ? cacheMissExplainedAt : undefined,`. Dòng 727 là `messages.splice(i, 1);` — không liên quan. | `rg -n 'cacheMissExplainedAt'` toàn repo |
| 10 | `session-context.ts:364-378` "mảng dựng ở" | `trackMessageCacheState` + `pushMessage` | `:364–372` là `trackMessageCacheState`; `pushMessage` ở `:374–378`. Mảng khai báo ở **`:345`**, không phải 364. | `awk 'NR>=360 && NR<=380'` |
| 11 | `model-controls.ts:634-637` cho `purpose: "auto-thinking"` | chỗ ghi `model_usage` | Đúng là nơi `appendModelUsage` được gọi (`:635`), nhưng **literal `"auto-thinking"` không ở đây** — nó ở `packages/coding-agent/src/auto-thinking/classifier.ts:144`. | `rg -n '"auto-thinking"'` |
| 12 | `command-controller.ts:431` "khối Cost kết thúc ở" | đóng khối `Cost` | **`:428`**. Dòng 430 đã là `if (this.ctx.lspServers…)`, 431 là `info += \`\n${theme.bold("LSP Servers")}\n\`;`. Chèn giữa 429 và 430. | `awk 'NR>=412 && NR<=434'` |
| 13 | `command-controller.ts:420` cho `stats.cost.toFixed(4)` | dòng `Total:` | **`:418`**. Dòng 420 là `if (normalizedPremiumRequests > 0) {`. | `awk` |
| 14 | `command-controller.ts:384` cho render `routedModels` | `replaceTabs(sanitizeText(id))` | **`:383`**. Dòng 384 là `);` đóng `.map(`. | `awk 'NR>=374 && NR<=392'` |
| 15 | `command-controller.ts:380-386` | khối `routedModels` | `:379–386` — `if (stats.routedModels !== undefined) {` mở ở **379**. | `awk` |
| 16 | `usage-report.ts:186` "sau `return` sớm" | sau nhánh provider-reported | `return renderUsageReports(...)` là `:180–185`, `}` đóng ở 186. Dòng `Cost: $...` là **`:200`**. | `awk 'NR>=178 && NR<=202'` |
| 17 | `usage-report.ts:175-186` "nhánh provider-reported" | cả nhánh | `:172–187` (`if (provider.fetchUsageReports) {` mở ở **172**). | `awk` |
| 18 | `ai/src/types.ts:1130-1138` cho `upstreamModel` | field + doc | **`:1118–1125`** — doc 1118–1124, field ở 1125. Lệch 12 dòng. | `awk 'NR>=1116 && NR<=1127'` |
| 19 | `ai/src/stream.ts:1209` = `ANTHROPIC_CACHE_TTL_MS` | hằng số TTL | **KHÔNG TỒN TẠI.** Dòng 1209 trống; 1208 là `return { ...options, sessionId: crypto.randomUUID() };`. `rg -rn 'ANTHROPIC_CACHE_TTL_MS' .` chỉ trúng chính các file kế hoạch. | `rg -rn` toàn repo + `awk 'NR>=1205 && NR<=1212'` |
| 20 | `ai/src/types.ts:1178-1198` cho `ToolResultMessage` | interface | **`:1166–1186`**. Lệch 12 dòng. | `rg -n 'export interface ToolResultMessage'` → 1166 |
| 21 | `telemetry.ts:1566, 1590, 1598, 1605` cho `responseModel` | các hit OTel | Hit thật: **`:1589, 1613, 1621, 1629, 1672, 1716`**. Cả 4 số trong plan đều sai. Ngoài ra plan nói "chỉ trúng telemetry" — **sai**, còn `judgment/index.ts:96, 271, 277, 441`. | `rg -n 'responseModel' --type ts` |
| 22 | `catalog/src/types.ts:1116-1122` | `TokenCost` | ✅ **ĐÚNG CHÍNH XÁC.** `1116: /** Per-million-token rates for one model pricing tier. */` … `1122: }` | `awk` |
| 23 | `tui/.../cache-invalidation-marker.ts:12` | `MIN_CACHE_FOOTPRINT` | ✅ Đúng — `const MIN_CACHE_FOOTPRINT = 2048;` | `rg -n` |
| 24 | `…cache-invalidation-marker.ts:55` | `prev.cacheRead < MIN_CACHE_FOOTPRINT` | ✅ Đúng | `rg -n` |
| 25 | `…cache-invalidation-marker.ts:61` | `current.cacheWrite > 0` | **`:62`**: `if (current.cacheWrite <= 0) return undefined;`. Lệch 1. | `rg -n` |
| 26 | `…cache-invalidation-marker.ts:29-44` doc comment | doc giải thích implicit-cache | Doc `:40–47` mới là đoạn giải thích implicit-cache; `:31–38` là đoạn "Requiring a prior warm read". `29–44` cắt ngang cả hai. | `awk 'NR>=28 && NR<=46'` |
| 27 | `session-stats.ts:422-426` `taskToolUsage`, `:428-438` `isUsage` | hai hàm | ✅ **ĐÚNG CHÍNH XÁC CẢ HAI.** | `awk 'NR>=414 && NR<=440'` |
| 28 | `session-stats.ts:155-158` cho `toolName === "task"` | điều kiện | ✅ Đúng — 155 mở, 156 `taskToolUsage`, 157 `addUsage`, 158 `}`. | `awk` |
| 29 | `session-context.ts:117, 345, 377` | `cacheMissExplainedAt` | ✅ Cả ba đúng. `:577` (call site thứ hai) cũng đúng. | `rg -n` + `awk` |
| 30 | `session-context.ts:375-376` "return sớm trước khi push" | thứ tự | `375: messages.push(msg);` rồi `376: if (!options?.transcript) return;` — **push ở TRƯỚC**, guard ở SAU. Plan mô tả ngược. | `awk` |
| 31 | `agent-session.ts:408` cho import `./session-stats` | import | **`:411`**: `import { SessionStatsTracker, type SessionStatsTrackerHost } from "./session-stats";`. Lệch 3. | `rg -n 'from "./session-stats"'` |
| 32 | `preview-session.ts:43`, `status-line.ts:40` là object literal `SessionStats` | fixture buộc `optional` | Cả hai là `getUsageStatistics: () => ({` — **`UsageStatistics`**, không phải `SessionStats`. Không có object literal `SessionStats` nào trong repo. | `awk 'NR>=40 && NR<=46'` / `:38–44` + `rg` |
| 33 | `usage-report.ts:167` "export duy nhất, file 202 dòng" | cả hai | ✅ **Cả hai đúng.** `rg -n '^export'` → đúng một dòng `167:export async function buildUsageReportText(...)`; `wc -l` → 202. | `rg` + `wc -l` |
| 34 | `usage-statistics.test.ts:1-70` làm mẫu fixture | pattern | ✅ Đúng — fixture `modelUsage` ở `:4–21`, `SessionManager.inMemory()` ở `:25`. | đọc file |
| 35 | HEAD là `ecd516f` | HEAD | **STALE** — HEAD hiện tại là `65cc6c1` (`test(coding-agent): opt in explicitly where the suite is about parsing`). | `git log --oneline -1` |
| 36 | `pi-ref/…/core/usage-totals.ts` | file tham chiếu | ✅ Đúng khi nói **không tồn tại** — `ls -d pi-ref` → No such file. Nhưng lưu ý `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` **có** mặt ở repo root và chứa các đoạn trích cùng nguồn. | `ls` |
| 37 | `usage-breakdown.ts`, `usage-breakdown.test.ts` chưa tồn tại | file mới | ✅ Cả hai chưa có. `packages/coding-agent/src/session/` không có `index.ts` barrel → module phẳng với import tương đối là đúng hình dạng. `ls packages/coding-agent/test/*.test.ts \| wc -l` → **791**. | `ls` + `wc` |
| 38 | Cần `brew install ninja` + `bun --cwd=packages/natives run build` trước khi test | chuẩn bị | **THỪA Ở CÂY HIỆN TẠI.** `which ninja` → `/opt/homebrew/bin/ninja`; `packages/natives/native/pi_natives.darwin-arm64.node` đã tồn tại (185 MB); `bun test usage-statistics.test.ts` chạy được ngay (7 pass). | `which ninja`, `ls`, `bun test` |
| 39 | `judgment/index.ts:78-85` cho "purpose judgment tự do" | khai báo `purpose` | `purpose: string;` ở **`:77`**, doc ở `:76`. `78–85` là khối `onUsage`/`telemetry`/`cache`. Lệch nhẹ. | `awk 'NR>=74 && NR<=90'` |

**Tổng: 39 dòng kiểm (chứa ~60 neo cá nhân) — 12 dòng đúng chính xác, 27 dòng lệch hoặc hỏng.** Mọi mục trên đã được sửa ở Mục 2 và Mục 3 của phiếu này; **không sửa gì trong `MILESTONE_1_EXECUTION_PLAN.md`**.
