# PHIẾU TRIỂN KHAI — W7

**Nguồn:** `MILESTONE_1_EXECUTION_PLAN.md`, mục `## W7. Thêm trục tuổi thọ prompt-cache theo từng tier vào model catalog qua cây KDL` (dòng 1385–1560).
**Cây tham chiếu dùng:** `/Users/tranquangdang21/Projects/ultraworkers` (omp, branch `milestone-1`).
**Trạng thái HEAD lúc kiểm:** `65cc6c1 test(coding-agent): opt in explicitly where the suite is about parsing`.

> **Cảnh báo đầu phiếu — ba luận điểm trong §Xác minh của W7 đã hỏng theo thời gian.** Đọc mục §5 (Cổng) trước khi gõ bất cứ dòng nào. Đặc biệt: `bun test` **không** bị chặn nữa, và `check:ts` **có** bị nhiễu nhưng bằng một cơ chế khác với plan mô tả.

---

## 1. Cái gì thay đổi, quan sát được

`buildModel(<bất kỳ model Anthropic nào>).compat.promptCacheLifetime` bắt đầu trả về `{ short: <số giây>, long: <số giây> }` cho những model mà cây KDL khai báo; model không khai báo thì trả `undefined`; và `prompt_cache_options` gửi đi OpenAI **không đổi một byte nào**.

Không có bề mặt người dùng. Không có byte request nào đổi. Giá trị nằm ở catalog.

---

## 2. Bảng điểm sửa

TRƯỚC được trích nguyên văn từ file thật, đã mở và đọc trong cây này.

| đường/dẫn | symbol / hàm | TRƯỚC (nguyên văn) | SAU (hình dạng sau khi sửa) |
| --- | --- | --- | --- |
| `packages/catalog/src/types.ts` (ngay trên dòng 526) | *(chưa tồn tại)* | dòng 525 là ` */` — dòng kết của doc comment ngay trên `export interface AnthropicCompat` | thêm 2 export: `export type CacheRetentionTier = "short" \| "long";` và `export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;` kèm doc comment (đơn vị **giây**, khoá vắng mặt = chưa biết) |
| `packages/catalog/src/types.ts:526` | `AnthropicCompat` | `export interface AnthropicCompat {` | giữ nguyên dòng này; **bên trong thân interface** thêm `promptCacheLifetime?: PromptCacheLifetime;` |
| `packages/catalog/src/types.ts:237` | `OpenAICompat` | `export interface OpenAICompat {` | **không sửa.** Field KHÔNG được đặt ở đây (xem §6 cạm bẫy #1) |
| `packages/catalog/src/types.ts:963` | `ResolvedAnthropicCompat` | `export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {` | `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard" \| "promptCacheLifetime">> & {` và bên trong `& { … }` khai lại `promptCacheLifetime?: PromptCacheLifetime;` |
| `packages/catalog/src/compat/axes.ts` (cạnh dòng 216–218) | `AXES` | dòng 216–218 hiện là:<br>`"prompt-cache-maximum-checkpoints": wire("promptCacheMaximumCheckpoints", ["bedrock"]),`<br>`"prompt-cache-minimum-tokens": wire("promptCacheMinimumTokens", ["bedrock"]),`<br>`"prompt-cache-mode": wire("promptCacheMode", ["bedrock"], "scalar", ["none", "automatic", "explicit"]),` | thêm một dòng:<br>`"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),`<br>*(bỏ `"bedrock"` nếu OQ1 nghiêng về phương án khuyến nghị)* |
| `packages/catalog/src/compat/rules/classes/anthropic.kdl` (trong một khối `on "anthropic"`, ví dụ khối mở ở dòng 44) | rule block | khối `on "anthropic" {` ở dòng 44 hiện chưa có directive cache-lifetime | thêm khối con:<br>`prompt-cache-lifetime {`<br>`    short 300`<br>`    long 3600`<br>`}`<br>**số không nhấy**, mỗi giá trị kèm comment nguồn provider |
| `packages/catalog/src/compat/rules.json` | *(sinh ra)* | file sinh tự động, **không sửa tay** | `bun run gen:compat` sinh lại; kiểm tra diff cả 3 file sinh |
| `packages/catalog/test/prompt-cache-lifetime.test.ts` | *(tạo mới)* | không tồn tại | 4 case: (a) lộ cả hai tier, (b) `undefined` tường minh, (c) `promptCacheBreakpointTtl === "30m"` không đổi, (d) ca phủ định không rò sang provider khác |
| `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` | *(tạo mới)* | không tồn tại | `prompt_cache_options` deep-equal giữa model có/không `promptCacheLifetime` |

**Không sửa:** `packages/ai/src/providers/*.ts` (trừ khi OQ2 chọn phương án (a)). Wire OpenAI phải giữ nguyên — đó là cả hợp đồng của work item.

---

## 3. Các bước (mọi neo đã mở và đọc)

### Bước 0 — CHỐT OQ1 TRƯỚC KHI VIẾT DÒNG KDL NÀO

OQ1 là câu hỏi chặn khởi động, và nó **quyết định luôn nội dung dòng `axes.ts` ở bước 4**. Không thể làm sau.

Sự thật đã kiểm chứng trong cây: đã tồn tại một trục anh em **đã nối đầy đủ**:

- `packages/catalog/src/compat/axes.ts:153` → `"supports-long-prompt-cache-retention": wire("supportsLongPromptCacheRetention", [...OAI, "bedrock"]),`
  (Lưu ý: records **không** chứa `"anthropic"`, nên nó không bao giờ chạm model `anthropic-messages`.)
- Khai báo ở `anthropic.kdl` các dòng `266, 286, 292, 317, 328, 341, 349` — tất cả đều là `supports-long-prompt-cache-retention #true` (đã grep xác nhận).
- Consumer sống #1: `packages/ai/src/providers/amazon-bedrock.ts:960` →
  `...(cacheRetention === "long" && model.compat.supportsLongPromptCacheRetention ? { ttl: "1h" } : {}),`
- Consumer sống #2: `packages/ai/src/providers/openai-responses.ts:1253` →
  `? cacheRetention === "long" && model.compat.supportsLongPromptCacheRetention`
- Resolve: `resolve.ts:721` (`supportsLongPromptCacheRetention: isOpenAIUrl,`), `resolve.ts:830`, baseline hard-code `false` ở `resolve.ts:899`.

Khi `promptCacheLifetime` tồn tại sẽ có **hai nguồn sự thật cho cùng một điều**. Phải có người quyết trước.

**Khuyến nghị (là khuyến nghị, KHÔNG phải quyền tự quyết):** giữ boolean, giới hạn trục mới về `["anthropic"]`, mở work item riêng cho việc hợp nhất. Nếu chọn phương án này thì bước 4 dùng `["anthropic"]` và **bước 6 bỏ qua hoàn toàn**.

### Bước 1 — `packages/catalog/src/types.ts` (đặt giữa dòng 525 và 526)

Đã đọc: dòng 525 là ` */`, dòng 526 là `export interface AnthropicCompat {`. Chèn hai type alias **ở giữa**, tức ngay trên interface, **không** đặt bên trong interface.

```ts
export type CacheRetentionTier = "short" | "long";

/**
 * Thời gian sống của entry prompt cache theo từng tier, tính bằng GIÂY.
 * Một khoá vắng mặt nghĩa là thời gian sống của tier đó chưa biết —
 * consumer phải fail safe, không được thay bằng giá trị mặc định.
 * Do KDL axis `prompt-cache-lifetime` sở hữu.
 */
export type PromptCacheLifetime = Partial<Record<CacheRetentionTier, number>>;
```

### Bước 2 — `packages/catalog/src/types.ts:526` (thân `AnthropicCompat`)

Thêm vào thân interface, kèm doc comment nói rõ giá trị do KDL axis sở hữu và **không** được set khi chưa biết:

```ts
promptCacheLifetime?: PromptCacheLifetime;
```

**Không** thêm vào `OpenAICompat` (`types.ts:237`) — xem §6 cạm bẫy #1.

### Bước 3 — `packages/catalog/src/types.ts:963` (`ResolvedAnthropicCompat`)

Đã đọc nguyên văn dòng 963:
`export type ResolvedAnthropicCompat = Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" | "thinkingLoopGuard">> & {`

Vì có `Required<>`, một field optional mới sẽ thành field **bắt buộc** trên kiểu resolved, trong khi `resolveAnthropicPolicy` không bao giờ gán nó. Thêm `"promptCacheLifetime"` vào union `Omit<...>`, rồi khai lại optional trong `& { ... }` — đúng mẫu file đã dùng cho `streamIdleTimeoutMs` và `thinkingLoopGuard`.

**Bước bắt buộc.** Bỏ qua thì kiểu nói dối về giá trị runtime. Cổng kiểu ở §5 bắt được cái này.

### Bước 4 — `packages/catalog/src/compat/axes.ts` (chèn cạnh dòng 216–218)

Đã đọc dòng 214–218, xác nhận 216–218 đúng là ba trục prompt-cache của bedrock. Thêm:

```ts
"prompt-cache-lifetime": wire("promptCacheLifetime", ["anthropic", "bedrock"], "object"),
```

Đã đọc `wire()` ở `axes.ts:74`:
`function wire(key: string, records: readonly CompatRecordName[], shape: AxisShape = "scalar", values?: readonly string[]): AxisDef`
→ lời gọi 3 tham số là hợp lệ. Có tiền lệ: `axes.ts:106` dùng 4 tham số, `"reasoning-effort-map": wire("reasoningEffortMap", OAI, "object")` dùng đúng 3 tham số với shape `object`.

Tham số thứ ba **phải** là `"object"`. Đã đọc `axisValue()` trong `compile-axes.ts`: shape `scalar` kiểm `if (node.args.length !== 1 || node.children) malformed(node);` — tức một khối con sẽ làm đỏ. Shape `object` kiểm `if (node.args.length > 0 || !node.children) malformed(node);` rồi gọi `objectValue()`.

**Không truyền mảng `values`** — tham số thứ tư chỉ áp cho shape `scalar`/`array`.

### Bước 5 — `packages/catalog/src/compat/rules/classes/anthropic.kdl` (khối `on "anthropic"`)

Đã đọc và xác nhận các khối `on "anthropic"` của file nằm ở các dòng **14** (`on "anthropic" "google-vertex" {`), **44** (`on "anthropic" {`), **64** (`on "anthropic" "cloudflare-ai-gateway" "google-vertex" {`), **183** (`on "anthropic" {`). File dài 371 dòng.

Khối `on "amazon-bedrock" {` mở ở dòng **255**, và **toàn bộ** các nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` hiện có (dòng 258–349) đều **nằm bên trong khối Bedrock đó** — chúng không áp cho Anthropic first-party.

Comment nguồn bắt buộc, theo đúng quy ước file; mẫu có sẵn ở dòng 252–254:
```
	// AWS Bedrock Converse prompt-cache checkpoints, from the AWS model cards
	// (docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html); cache
	// pricing is deliberately not used to infer these request shapes.
```

Hình dạng:
```kdl
	  prompt-cache-lifetime {
	      short 300
	      long 3600
	  }
```

Dùng `short`/`long` làm tên con: `payloadKey()` (`compile-axes.ts:28-33`) trả `AXES[child.name]?.key ?? child.name.replace(/-([a-z0-9])/g, …)`. Đã grep xác nhận **không có** axis nào tên `short` hoặc `long`, nên cả hai tên đi thẳng qua nguyên vẹn. Một tên con viết camelCase sẽ đỏ với ``object payload key `X` must be kebab-case``.

Có thể chỉ khai một tier trong một khối nhất định — payload thực sự partial.

> **Xem §6 cạm bẫy #2 trước khi gõ số.** Câu "kiểu resolved đòi hỏi một `number`" trong plan **không phải** một cổng đỏ được.

### Bước 6 — `anthropic.kdl` khối `on "amazon-bedrock"` (dòng 255)

Chỉ làm nếu OQ1 nghiêng sang phương án đưa Bedrock vào. Nếu OQ1 theo khuyến nghị: **bỏ qua bước này** và đặt records của trục là `["anthropic"]` thôi.

### Bước 7 — `repo root` → `bun run gen:compat`

Đã chạy thử ở cây này: **exit 0**, in
`wrote src/compat/rules.json (737 rules, 21 classes, 82 catalog providers, 91 auth providers, 221 files)`
và `git status --short packages/catalog/` **rỗng** — generator tất định, baseline sạch.

> Lưu ý: plan ghi "736 rules". Con số thật ở HEAD `65cc6c1` là **737**. Đừng hoảng khi thấy lệch — nó chỉ phản ánh repo đã đi tiếp.

Đã đọc `packages/catalog/scripts/compile-compat.ts:11-18`: một lần chạy ghi **ba** file —
`outPath` (`rules.json`), `authIdsPath` (`auth-ids.ts`), `providerIdsPath` (`provider-ids.ts`).
Kiểm tra `git status --short packages/catalog/` cho **cả ba**, đừng giả định chỉ `rules.json` dịch chuyển.

### Bước 8 — `packages/catalog/test/prompt-cache-lifetime.test.ts`

Mẫu `spec()` đã đọc tại `packages/catalog/test/anthropic-fable-5-1-cache-read.test.ts:20`:
`function spec(id: string): ModelSpec<"anthropic-messages"> {`

Bốn case, xem §4.

### Bước 9 — `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts`

Xem OQ2 ở §6 cạm bẫy #3 — đã có sẵn 10 test đang import `buildParams`, làm theo mẫu là rẻ nhất.

### Bước 10 — `packages/catalog/CHANGELOG.md` (+ `packages/ai/CHANGELOG.md` nếu có đụng source `packages/ai`)

Một dòng dưới `## [Unreleased]`, ngắn, diễn đạt theo năng lực mở ra chứ không mô tả việc. Đừng phê bình thứ tự mục — `bun run release` chuẩn hoá.

---

## 4. Hợp đồng test

### `packages/catalog/test/prompt-cache-lifetime.test.ts`

| # | Case | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| (a) | model mà KDL khai báo | `buildModel(...).compat.promptCacheLifetime` lộ **cả hai** tier dưới dạng `number` (giây) | consumer phải quay lại hằng số hard-code; phần cache economics của Wave 3a mất nền |
| (b) | model không khai báo gì | field resolve về `undefined` — **khẳng định tường minh**, đừng để pass bằng sót | trục default về `0`/hằng số ⇒ nhánh fail-safe của W8 được giả định chứ không bảo vệ |
| (c) | fixture openai gpt-5.6 hiện có | `promptCacheBreakpointTtl === "30m"`, `supportsPromptCacheBreakpoints === true` | request OpenAI đổi byte — quyết định "thêm trục anh em, **không** mở rộng field wire hiện có" bị phá |
| (d) | ca phủ định rò trục | model thuộc provider **không** nằm trong records của trục thì field vắng | trục rò sang provider nó không được viết cho |

Mẫu cho (c): `packages/catalog/test/build.test.ts:960` có `describe("OpenAI explicit prompt-cache breakpoint compat", …)` với fixture `completionsSpec({ id: "gpt-5.6", provider: "openai", baseUrl: "https://api.openai.com/v1" })` và assert `promptCacheBreakpointTtl).toBe("30m")` ở dòng 975/977.

### `packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts`

| # | Case | Khẳng định | Người dùng thấy gì nếu hồi quy |
| --- | --- | --- | --- |
| (d') | model OpenAI Responses **có** `promptCacheLifetime` vs model giống hệt **không** có | `prompt_cache_options` sinh ra **deep-equal** | một trường lạ xuất hiện trong request OpenAI |

Cùng file đó phải chứng minh (c) ở cấp wire: chuỗi `ttl: promptCache.ttl ?? model.compat.promptCacheBreakpointTtl` tồn tại nguyên văn ở `openai-responses.ts:1168` và `openai-completions.ts:1791` (đã đọc cả hai).

**Cấm tuyệt đối:** không viết test này thành source-grep hai dòng `ttl:`. `AGENTS.md` cấm source-grep hoàn toàn, và test kiểu đó **vẫn xanh ngay cả khi trục được nối ngược** — tức nó bảo vệ sai thứ.

---

## 5. Cổng

### Trạng thái thật đo được ở cây này

| Lệnh | Kết quả đo được | Ghi chú |
| --- | --- | --- |
| `bun run gen:compat` | **exit 0**, in `… (737 rules, …)`, `git status --short packages/catalog/` **rỗng** | generator tất định, baseline sạch |
| `bun run --filter @oh-my-pi/pi-catalog check:types` | **exit 0** — `@oh-my-pi/pi-catalog:check:types \| Done in 6.04s` | cổng đáng tin nhất |
| `bun test packages/catalog/test/` | **955 pass / 0 fail / 123 file** | ⚠️ **plan nói `bun test` bị chặn — KHÔNG còn đúng** |
| `bun run check:ts` | **exit 1**, nhưng lỗi **đổi mỗi lần chạy** | ⚠️ xem bên dưới |

### Ba điều chỉnh so với plan

**(1) `bun test` KHÔNG còn bị chặn.** Plan ghi `Failed to load pi_natives native addon for darwin-arm64`. Đo lại: addon **đã có** tại `packages/natives/native/pi_natives.darwin-arm64.node`; `bun test packages/catalog/test/build.test.ts` → `81 pass, 0 fail`; `bun test packages/catalog/test/` → `955 pass, 0 fail`. **Cổng test chạy được. Hãy chạy nó.**

**(2) `check:ts` nhiễu, nhưng bằng cơ chế khác.** Plan nêu ba file `w3-scratch-verify.ts`, `__probe.types.ts`, `__probe2.types.ts` ở gốc `packages/coding-agent/`. **Không file nào tồn tại.** Lần chạy thực tế:
- lần 1 → 5 lỗi TS ở `@oh-my-pi/collab-web` về `"bye"` không thuộc union frame;
- lần 2 → 1 lỗi `TS2741` ở `@oh-my-pi/pi-coding-agent`, file `packages/coding-agent/src/collab/w3-scratch-verify.ts` (26 byte, `??` untracked — đúng là scratch probe của phiên song song, nhưng nằm ở `src/collab/`, không ở gốc package).

Kết luận: chẩn đoán của plan **đúng bản chất** (phiên song song ghi file scratch), **sai đường dẫn**. Baseline **di chuyển giữa các lần chạy**, nên "so với baseline" không có nghĩa nếu không chụp baseline ngay trước lúc chạy.

**(3) Anchor `package.json:93` sai.** Plan dùng nó làm bằng chứng cho "`bun check` = `check:ts` + `check:rs` chạy song song". `sed -n '93p' package.json` cho ra `"lint": "bun run --parallel lint:ts lint:rs"`. Dòng đúng là **89**: `"check": "bun run --parallel check:ts check:rs"`.

### Cổng đề xuất (thay bốn điều kiện cũ)

1. `bun run gen:compat` exit 0 **và** `git status --short packages/catalog/` chỉ hiện `rules.json` (+ `auth-ids.ts` / `provider-ids.ts` nếu dịch chuyển) cùng bản sửa `.kdl` của bạn.
2. `bun run --filter @oh-my-pi/pi-catalog check:types` exit 0.
3. `bun test packages/catalog/test/prompt-cache-lifetime.test.ts packages/ai/test/prompt-cache-lifetime-wire-unchanged.test.ts` xanh toàn bộ.
4. `bun test packages/catalog/test/build.test.ts` vẫn xanh — đặc biệt `describe("OpenAI explicit prompt-cache breakpoint compat")` không đổi.
5. `bun run check:ts` — **chạy sau cùng, và chỉ để ghi nhận**, không dùng làm tiêu chí đỏ/được. Chụp output, so với `git stash`-level baseline của chính bạn. Lý do: nó đang đỏ vì file scratch của phiên khác, đỏ vì lý do không liên quan tới W7, và **đổi mặt mỗi lần chạy**.

### Cổng này có ĐỎ ĐƯỢC không — và bằng cách nào

**ĐỎ ĐƯỢC, phần lớn.** Đã đọc và xác nhận từng đường lỗi trong `packages/catalog/scripts/compat-compiler/compile-axes.ts` và `kdl-reader.ts`:

| Sai lầm | Đỏ bằng thông điệp này | Đọc ở đâu |
| --- | --- | --- |
| Directive chưa đăng ký | ``unknown directive `prompt-cache-lifetime` `` | `compile-axes.ts:90` (`axisFor`) |
| Shape sai (scalar bị đưa khối con, hoặc object không có khối con) | ``directive `X` has a malformed value`` | `kdl-reader.ts:80-81` (`malformed`) |
| Tên con camelCase | ``object payload key `X` must be kebab-case`` | `compile-axes.ts:30` (`payloadKey`) |
| Gán trục hai lần trong cùng một khối | ``axis `X` assigned twice in one block`` | `compile-axes.ts:101` (`collectAxis`) |
| Quên bước `Omit` (bước 3) | lỗi kiểu từ `check:types` | `types.ts:963` |

Đây là những cổng thật, chẩn đoán được, fail sớm.

### ⚠️ Nơi cổng KHÔNG đỏ được — phải biết trước

1. **Không cổng nào đỏ được cho "hai trục nói cùng một sự thật".** Plan (khối F5) hứa `AmbiguousOverlapError`. Đã đọc `cascade.ts:6-9` và `cascade.ts:245-253`: tranh chấp khoá theo `winners[axis]`, **hai axis khác nhau không bao giờ va nhau**. Viết `prompt-cache-lifetime` cạnh `supports-long-prompt-cache-retention` sẽ **không** tạo bất kỳ lỗi compiler nào. Vấn đề thiết kế có thật, nhưng không có tripwire tự động — đó là lý do OQ1 vẫn phải được quyết có chủ đích.

2. **Không cổng nào đỏ được cho "số bị viết thành chuỗi".** Plan bước 5 nói *"kiểu resolved đòi hỏi một `number`"* — **câu này sai về cơ chế.** Đã đọc: `objectValue()` (`compile-axes.ts:41`) gọi `scalarValue()` (`:17-20`) trả thẳng `KdlScalar` (`string|number|boolean|null`), chỉ loại `null`. Rồi `applyWireAxes` (`resolve.ts:131-140`) gán bằng `Reflect.set(compat, key, wire[key])` trên `object` — **không có kiểm tra kiểu nào ở đây**. Nên `short "300"` (có nháy) sẽ:
   - qua `gen:compat` ✅
   - qua `check:types` ✅
   - qua cả 5 cổng ✅
   - và đẩy một **string** vào `compat.promptCacheLifetime.short` ở runtime.

   Chỉ test case (a) mới bắt được. **Đây là lý do case (a) phải assert `typeof === "number"`, không được assert `toEqual` mơ hồ.**

3. **`check:ts` không phải cổng.** Nó đang đỏ vì file scratch của phiên khác và đổi mặt mỗi lần chạy. Dùng nó làm tiêu chí đỏ/được tạo ra an toàn giả.

---

## 6. Cạm bẫy riêng của work item này

### #1 — Dễ nhất: đặt field vào `OpenAICompat` (`:237`) theo đúng chỉ dẫn file của plan

Plan gốc bảo đặt field "ngay cạnh `promptCacheBreakpointTtl?: "30m"` ở `types.ts:403`". Đã đọc: `:403` nằm trong `OpenAICompat` (khai báo ở `:237`). Đặt ở đó sẽ đặt trục lên shape chỉ-dành-OpenAI, khiến nó **vĩnh viễn vô hình với đúng consumer duy nhất cần tới nó**.

Vì sao im lặng: `applyWireAxes` (`resolve.ts:131-140`) chỉ gán khi API của model ánh xạng tới một record mà trục khai báo. `API_COMPAT_RECORDS` (đã đọc `axes.ts:380-391`) map `anthropic-messages` → `["anthropic"]` và `openai-responses` → `["openai-responses"]` — hai tập rời nhau. Code sẽ type-check, compile, regenerate sạch, qua mọi cổng, **và chết lặng lẽ ở runtime**.

### #2 — Dễ nhất thứ hai: chép anchor `:255-360` và đặt rule chỉ trong khối Bedrock

Toàn bộ nhóm `prompt-cache-mode` / `prompt-cache-minimum-tokens` / `prompt-cache-maximum-checkpoints` hiện có (dòng 258–349) đều nằm bên trong `on "amazon-bedrock" {` mở ở dòng 255. Chép nguyên anchor sẽ viết rule chỉ cho Bedrock, để Anthropic first-party — họ model mà mọi consumer tương lai phục vụ — không có gì.

**Không cái sai nào trong hai cái này tạo ra một build đỏ.** Đó là lý do test (a) và test (d) tồn tại.

### #3 — OQ2: đường completions không có cửa public

Đã xác nhận, và **đã có sẵn cách rẻ** mà plan chưa biết:

- `openai-responses.ts:1174` → `export function buildParams(` — export, dùng được. Nó gọi policy ở `:1365` (`applyOpenAIResponsesPromptCachePolicy(params, model, options, statefulCacheBaseline);`).
- `openai-completions.ts:1797` → `function buildParams(` — **không** export. Policy `:1767` cũng private, chỉ reachable từ `:1999`. Danh sách export thật của file (đã grep `^export `): `applyOpenRouterRoutingVariant` (:121), `isOpenAICompletionsProgressChunk` (:539), `OpenAICompletionsOptions` (:573), `streamOpenAICompletions` (:1646), `parseChunkUsage` (:2009), `convertMessages` (:2092) — không có `buildParams`.

**Khuyến nghị: chọn phương án (c) — không cần sửa production code.** Đã có **10 test** đang import `buildParams` từ `@oh-my-pi/pi-ai/providers/openai-responses` và gọi dạng `buildParams(model, context, options, undefined).params` — xem `packages/ai/test/abliteration-effort-aliases.test.ts:16`. `packages/ai/test/openai-responses-cache-affinity.test.ts` là mẫu gần nhất về chủ đề cache. Chọn (a) (export thêm `buildParams` từ `openai-completions`) là **mở rộng public surface chỉ để test được** — tránh nếu có thể.

**Ghi lựa chọn vào comment đầu file test** như plan yêu cầu.

### #4 — Hai neo đã chết, đừng tìm

`ANTHROPIC_CACHE_TTL_MS` **không tồn tại** trong mã nguồn (grep toàn repo chỉ ra nó chỉ xuất hiện trong file kế hoạch). `stream.ts:1209` giờ là dòng `}` đóng hàm trước; `sdk.ts:4111` giờ là `promptCacheKey: providerPromptCacheKey,` — không còn bật vô điều kiện nào. Plan đã ghi đúng là chúng không còn tồn tại; chỉ cần biết để không mất thời gian truy vết.

### #5 — `gen:compat` in 737, không phải 736

Plan ghi output mẫu là `736 rules`. HEAD hiện tại in `737 rules`. Số liệu trong plan đã cũ; kết luận ("generator tất định, baseline sạch") vẫn đúng và đã được xác nhận lại.

---

## Phụ lục — Kết quả kiểm lại từng neo

**Đã kiểm:** 55. **Đúng:** 54. **Hỏng:** 1.

| Neo trong W7 | Kết quả |
| --- | --- |
| `types.ts:237` `export interface OpenAICompat {` | ✅ |
| `types.ts:393` `promptCacheSessionHeader?: "x-grok-conv-id";` | ✅ |
| `types.ts:403` `promptCacheBreakpointTtl?: "30m";` (trong `OpenAICompat`) | ✅ |
| `types.ts:526` `export interface AnthropicCompat {` | ✅ |
| `types.ts:745` `export interface ResolvedOpenAISharedCompat {` | ✅ |
| `types.ts:795` `promptCacheBreakpointTtl?: "30m";` (resolved) | ✅ |
| `types.ts:823` `export type ResolvedOpenAICompat = …` | ✅ |
| `types.ts:863-865` key union `promptCacheSessionHeader` / `supportsPromptCacheBreakpoints` / `promptCacheBreakpointTtl` | ✅ |
| `types.ts:963` `Required<Omit<AnthropicCompat, "streamIdleTimeoutMs" \| "thinkingLoopGuard">> & {` | ✅ |
| `axes.ts:74` chữ ký `wire(key, records, shape = "scalar", values?)` | ✅ |
| `axes.ts:106` `"prompt-cache-breakpoint-ttl": wire("promptCacheBreakpointTtl", OAI, "scalar", ["30m"])` | ✅ |
| `axes.ts:153` `"supports-long-prompt-cache-retention": wire("supportsLongPromptCacheRetention", [...OAI, "bedrock"])` | ✅ |
| `axes.ts:216-218` ba trục prompt-cache của bedrock | ✅ |
| `axes.ts:380` `export const API_COMPAT_RECORDS` (plan ghi `:369-381`) | ✅ trong khoảng, khai báo ở 380 |
| `axes.ts:386` `"anthropic-messages": ["anthropic"]` | ✅ |
| `resolve.ts:37` import `resolveCascade` từ `./cascade` | ✅ |
| `resolve.ts:131-140` `applyWireAxes` gate trên `meta?.records.some(...)` | ✅ |
| `resolve.ts:533` / `:723` `promptCacheBreakpointTtl: supportsPromptCacheBreakpoints ? "30m" : undefined` | ✅ |
| `resolve.ts:721` `supportsLongPromptCacheRetention: isOpenAIUrl,` | ✅ |
| `resolve.ts:830` `supportsLongPromptCacheRetention: compat.supportsLongPromptCacheRetention,` | ✅ |
| `resolve.ts:899` baseline `supportsLongPromptCacheRetention: false,` | ✅ |
| `cascade.ts:6-9` doc "per axis … an equal-tuple same-axis contest throws `AmbiguousOverlapError`" | ✅ |
| `cascade.ts:12` `import { LRUCache } from "@oh-my-pi/pi-utils/lru";` | ✅ |
| `cascade.ts:245-253` `const held = winners[axis];` | ✅ |
| `anthropic.kdl:14, 44, 64, 183` — bốn khối `on "anthropic"` | ✅ |
| `anthropic.kdl:252-254` comment model-card AWS | ✅ |
| `anthropic.kdl:255` `on "amazon-bedrock" {` | ✅ |
| `anthropic.kdl:258-266` nhóm prompt-cache đầu tiên (trong Bedrock) | ✅ |
| `anthropic.kdl:266, 286, 292, 317, 328, 341, 349` — bảy dòng `supports-long-prompt-cache-retention #true` | ✅ (grep xác nhận đủ bảy) |
| `compile-axes.ts:17-20` `scalarValue` trả thẳng `KdlScalar` | ✅ |
| `compile-axes.ts:28-33` `payloadKey` (kebab-case + tra `AXES[child.name]?.key`) | ✅ |
| `compile-axes.ts:41` `objectValue` | ✅ |
| `compile-axes.ts:87-90` `axisFor` → ``unknown directive `X` `` | ✅ |
| `compile-axes.ts:96-101` `collectAxis` → ``assigned twice in one block`` | ✅ |
| `kdl-reader.ts:80-81` `malformed` → ``directive `X` has a malformed value`` | ✅ |
| `compile-compat.ts:11-18` ghi `outPath`, `authIdsPath`, `providerIdsPath` | ✅ |
| `amazon-bedrock.ts:960` `…supportsLongPromptCacheRetention ? { ttl: "1h" } : {}` | ✅ |
| `openai-responses.ts:1168` `ttl: promptCache.ttl ?? model.compat.promptCacheBreakpointTtl,` | ✅ |
| `openai-responses.ts:1174` `export function buildParams(` | ✅ |
| `openai-responses.ts:1253` `? cacheRetention === "long" && model.compat.supportsLongPromptCacheRetention` | ✅ |
| `openai-responses.ts:1365` `applyOpenAIResponsesPromptCachePolicy(…)` | ✅ |
| `openai-completions.ts:1767` `function applyOpenAIChatCompletionsPromptCachePolicy(` (private) | ✅ |
| `openai-completions.ts:1791` `ttl: promptCache.ttl ?? …` | ✅ |
| `openai-completions.ts:1797` `function buildParams(` (**không** export) | ✅ |
| `openai-completions.ts:1999` `applyOpenAIChatCompletionsPromptCachePolicy(params, model, options);` | ✅ |
| danh sách `^export ` của `openai-completions.ts` (6 mục, không có `buildParams`) | ✅ khớp plan |
| `models-config-schema-bundle.ts:70` `"supportsLongPromptCacheRetention?": "boolean",` | ✅ |
| `models-config-schema-bundle.ts:96` `"supportsLongPromptCacheRetention?": "boolean",` | ✅ |
| `anthropic-fable-5-1-cache-read.test.ts:20` `function spec(id: string): ModelSpec<"anthropic-messages"> {` | ✅ |
| `build.test.ts:960` `describe("OpenAI explicit prompt-cache breakpoint compat", () => {` | ✅ |
| `stream.ts:1209` (plan nói đã chết) | ✅ xác nhận đã chết |
| `sdk.ts:4111` (plan nói đã chết) | ✅ nay là `promptCacheKey: providerPromptCacheKey,` |
| **`package.json:93`** (plan dùng làm bằng chứng `check` = `check:ts` + `check:rs`) | ❌ **HỎNG** — `:93` là `"lint": "bun run --parallel lint:ts lint:rs"`. Đúng là **`package.json:89`**: `"check": "bun run --parallel check:ts check:rs"` |
| `package.json:89` (dòng đúng, thay thế) | ✅ |

**Ngoài neo, ba tuyên bố đã lỗi thời:**

1. `bun test` **không** còn bị chặn. Đo: `bun test packages/catalog/test/` → **955 pass / 0 fail / 123 file**; addon có tại `packages/natives/native/pi_natives.darwin-arm64.node`. (`bazel`/`bazelisk` vẫn không có trong PATH; `cargo` có.)
2. Ba file scratch mà plan nêu tên (`w3-scratch-verify.ts`, `__probe.types.ts`, `__probe2.types.ts` ở gốc `packages/coding-agent/`) **không tồn tại**. File thật gây đỏ là `packages/coding-agent/src/collab/w3-scratch-verify.ts` (untracked, 26 byte) — chẩn đoán đúng, đường dẫn sai. Baseline `check:ts` còn **đổi mặt giữa hai lần chạy** (lần 1: 5 lỗi ở `collab-web`; lần 2: 1 lỗi TS2741 ở `pi-coding-agent`).
3. `gen:compat` in **737** rules, không phải 736. Vẫn exit 0 và `git status` rỗng — kết luận "tất định + baseline sạch" giữ nguyên.
