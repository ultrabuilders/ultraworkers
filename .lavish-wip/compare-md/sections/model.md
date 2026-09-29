## Miền: So sánh tầng model/provider: omp vs pi, opencode, codex, gajae

Miền: **định tuyến model, provider, tính giá, fallback**.
Ngày đo: 2026-09-28. Tất cả số đo chạy tại chỗ, không clone.

> Lưu ý về baseline đã cho: `5.325 file / 1.657.301 dòng` của omp là phép đo `find packages -name '*.ts'`
> (chỉ trong `packages/`, bỏ file ở gốc). Đo lại bằng `git ls-files` cho **5.522 file / 1.695.782 dòng TS+TSX**
> toàn repo. `git ls-tree -r HEAD` cũng ra 5.522 → không phải do file chưa commit. Các con số còn lại khớp
> hoặc lệch nhẹ: pi 1.591/379.654 (thay vì 1.564/377.103), gajae 4.474/1.781.490, opencode 4.355 TS+TSX
> (= 3.639 TS + 716 TSX ✓), codex 758 TS + 4.925 Rust ✓. Giấy phép: pi MIT · opencode MIT · codex Apache-2.0 ·
> gajae MIT — **cả bốn đều đúng**.

---

## Bối cảnh then chốt: quan hệ huyết thống

Trước khi so bảng, một sự thật làm thay đổi cách đọc toàn bộ phần còn lại:

```
$ head -3 omp/LICENSE   → MIT License  Copyright (c) 2025 Mario Zechner
$ head -3 pi/LICENSE    → MIT License  Copyright (c) 2025 Mario Zechner
```

Cùng một tác giả, cùng một giấy phép, và **4 tên package trùng** (`agent`, `ai`, `coding-agent`, `tui`).
**omp là hậu duệ của pi, không phải ngang hàng.** Với pi, "port" nghĩa là *chép cơ học có biến đổi*, không
phải viết lại — khớp với commit `1dd1e87 docs: package reorganization plan — make future copies from pi mechanical`.

Và quan trọng hơn: **gajae là một nhánh của chính dòng omp** nhưng đã gỡ tầng KDL đi. Đó là phép thử
tự nhiên (counterfactual) trả lời chính câu hỏi "đừng phá KDL" — xem `## Kết luận`.

---

## per_repo

| repo | Có gì | Bằng chứng (lệnh) | Kích thước |
|---|---|---|---|
| **omp** | 73 provider · 5.522 model · **tầng chính sách KDL** · cache SQLite 2h · fallback ở tầng credential | `python3 -c` đếm `packages/catalog/src/models.json`; `git ls-files packages/catalog/src/compat/rules \| grep -c kdl`; `grep -n DEFAULT_CACHE_TTL packages/catalog/src/model-manager.ts` | 221 file `.kdl` = **8.909 dòng** → `rules.json` **319.653 byte**; compiler `scripts/compat-compiler/` 2.815 dòng; discovery 15.542 dòng; provider-models 9.206 dòng; auth+broker+gateway **17.806 dòng** |
| **pi** | 42 provider · model data **không commit** · codegen TS 3.545 dòng · fallback chỉ lúc resolve | `grep -c 'from "./providers/' packages/ai/src/models.generated.ts`; `git check-ignore -v packages/ai/src/providers/data/anthropic.json`; `wc -l packages/ai/scripts/generate-models.ts` | `ai/src` 25.407 dòng; 42 file `.models.ts` chỉ **588 dòng** (chỉ là stub re-export); `model-catalog.ts` 81 dòng |
| **opencode** | 223 provider · 8.179 model · **không có tầng chính sách** · refresh 5 phút | `python3 -c` đếm `packages/core/src/models-dev/snapshot.txt`; `grep -n 'Duration.minutes(5)' packages/core/src/models-dev.ts` | `models-dev.ts` 453 dòng; `snapshot.txt` **4,7 MB / 101.969 dòng** (1 dòng JSON); 46 module provider |
| **codex** | **5 provider** · **10 model** · Rust · không giá · reroute **chỉ vì an toàn** | `sed -n '650,683p' codex-rs/model-provider-info/src/lib.rs`; `python3 -c` đếm `models.json`; `grep -A2 'enum ModelRerouteReason' codex-rs/protocol/src/protocol.rs` | `models.json` 1.436 dòng (51 khoá/model); `models-manager` 5.234 dòng; `model-provider` 8.158 dòng; `model-provider-info` 1.924 dòng |
| **gajae** | 57 provider · 4.670 model · **0 file `.kdl`** · chính sách nằm trong TS | `find . -name '*.kdl' \| wc -l` → **0**; `grep -oE '"[a-z0-9][a-z0-9._/-]{4,}"' packages/ai/src/model-thinking.ts \| sort -u \| wc -l` | `models.json` **101.969 dòng / 2,1 MB**; `model-pricing.ts` **101 dòng** hằng số giá; `model-thinking.ts` 1.179 dòng với **86 id model hardcode** |

---

## 1. Danh sách model lấy ở đâu

**omp** — file sinh ra, **có commit, khép kín**.
`models.json` (5.522 model, 73 provider) + `rules.json` (320 KB) đều nằm trong git:
```
$ git ls-files packages/catalog/src/compat/rules.json   → packages/catalog/src/compat/rules.json
$ git ls-files packages/catalog/src/compat/ | grep -cE '\.kdl$'   → 221
```
Ngoài ra còn có tầng khám phá runtime: `discovery/` 15.542 dòng + `provider-models/` 9.206 dòng.
Thang phân giải được khai báo tường minh trong `model-manager.ts:88`:
```ts
export type ModelResolutionSource = "bundled" | "cache" | "models.dev" | "provider";
```
→ `bundled` → `cache` → `models.dev` → gọi thẳng provider. Không cần mạng để resolve chính sách.

**pi** — file sinh ra, **KHÔNG commit**. Đây là phát hiện đáng chú ý nhất về mặt kỹ thuật:
```
$ git check-ignore -v packages/ai/src/providers/data/anthropic.json
.gitignore:11:packages/ai/src/providers/data/    packages/ai/src/providers/data/anthropic.json
$ ls packages/ai/src/providers/data | wc -l   → 0     (thư mục không tồn tại trên đĩa)
```
42 file `.models.ts` được commit (588 dòng) chỉ là stub:
```ts
import values from "./data/anthropic.json" with { type: "json" };
```
…nhưng file JSON đó bị gitignore. `packages/ai/package.json` buộc phải có mạng:
```
"build": "npm run generate-models && npm run build:offline"
```
Nghĩa là **clone sạch của pi là catalog hỏng** cho tới khi chạy codegen. Nguồn upstream: models.dev +
NVIDIA `/models` + OpenRouter `/api/v1/models` + Vercel AI Gateway `/models` (dòng 1259/1279/1326).
Quan trọng: chính sách không nằm ở runtime mà nằm trong **`generate-models.ts` 3.545 dòng TypeScript**,
trong đó có các bản vá viết tay kiểu "models.dev báo sai" (dòng 1517: *"Baseten's GLM-5.2 endpoints are
text-only despite models.dev reporting image input"*).

**opencode** — **runtime API + snapshot commit**.
```
$ ls -la packages/core/src/models-dev/snapshot.txt   → 4,7 MB
$ grep -n 'Duration.minutes(5)' packages/core/src/models-dev.ts   → dòng 333
```
453 dòng TS quản lý cache 5 phút (`Effect.repeat(Schedule.spaced(ttl))`, dòng 436) và có so sánh digest
để không phát lại sự kiện khi body không đổi. 223 provider / 8.179 model đến thẳng từ models.dev.

**codex** — **file viết tay, không có codegen**.
```
$ grep -rn "models.json" -- '*.rs' | grep -v test
codex-rs/models-manager/src/lib.rs:15:  serde_json::from_str(include_str!("../models.json"))
```
Không script nào sinh ra nó. 10 model, 51 khoá mỗi model — rất giàu *capability* metadata
(`tool_mode`, `truncation_policy`, `supported_reasoning_levels`, `service_tiers`…). Nhưng có tầng refresh
song song: `models_refresh_worker.rs:10` → `MODELS_REFRESH_INTERVAL = 4*60+30` giây, gọi `RefreshStrategy::Online`.

**gajae** — `models.json` 101.969 dòng commit, không có tầng sinh, không có tầng chính sách.

---

## 2. Tính giá

| repo | Tính tiền ở đâu | Cache-aware? | Số đo |
|---|---|---|---|
| **omp** | `calculateCost` từ `@oh-my-pi/pi-catalog/models`, dùng ở `auth-gateway/routes/*.ts`, `embeddings/` | **Có, 3 trường** + `longContext` + `timeBased` | **5.522/5.522** model có `cost.input`, `cost.cacheRead`, `cost.cacheWrite`; **35** model có `longContext`; **4** model có `timeBased` (hệ số peak/off-peak) |
| **pi** | `ModelCost` trong `types.ts:1021-1036` | Có, 4 trường + `tiers` | `ModelCostRates{input,output,cacheRead,cacheWrite}` + `ModelCost.tiers[]` |
| **opencode** | `session/usage.ts` → `calculateCost` | Có, + tier theo context | **56 dòng** cho cả file; xử lý `tier.type==="context"`, `cache.read`, `cache.write`, `usage.reasoning` |
| **codex** | **KHÔNG tính** | — | `grep -c '"(cost\|price\|input_cost\|output_cost)"' models.json` → **0**. `cost_usd` đến từ server: `codex-backend-openapi-models/src/models/analytics.rs:28` |
| **gajae** | `model-pricing.ts` | Có + longContext | **101 dòng hằng số TS** |

omp đứng đầu về độ sâu giá: `types.ts:1157`
```ts
export interface ModelCost extends TokenCost {
  longContext?: LongContextTokenCost;   // inputThreshold, inputThresholdInclusive
  timeBased?: TimeBasedCost;           // offPeakMultiplier, peakWindows[]
}
```
Đây là thứ mà cả bốn repo tham chiếu đều không có.

**codex không tính giá** là phát hiện có giá trị: 10 model, 0 trường giá, `cost_usd` là `Option<String>`
từ API backend. Với một agent tự chạy, codex đơn giản là **không biết mình tốn bao nhiêu**.

---

## 3. Fallback khi provider chết

Đây là chỗ omp vượt bốn repo **rất xa**, và cần đọc kỹ vì dễ kết luận sai.

**omp — 17.806 dòng, ở tầng credential/account** (không phải tầng model):
```
packages/ai/src/auth/          10.584 dòng (non-test)
packages/ai/src/auth-broker/ + auth-gateway/  7.222 dòng
```
Cơ chế đo được: `blocks.ts` (block theo rate-limit với backoff lưu **qua process** qua SQLite),
`health.ts` (probe từng credential, trạng thái `healthy`/`reserve`), `rotation.ts`, `cascade.ts`,
`affinity.ts`, `select.ts`, `pool.ts`, `rank.ts`, `policy.ts`. Nghĩa là: một account hết quota →
xoay sang account khác **cùng model**, có kiểm tra sức khoẻ trước.

Điều omp **không** làm: tự đổi sang *model khác* khi provider chết. `git grep 'fallbackModel|autoFallback|switchToModel|degradeModel'`
chỉ ra `model-resolver.ts:2361` — và đó là fallback khi **khôi phục session** không được, không phải lúc runtime.
Lưu ý tránh hiểu nhầm: trục `fallback` trong `behavior.kdl` (dòng 58-74) **không** phải định tuyến lỗi —
đó là phân loại identity (`fallback "anthropic" substring="claude-"`).

**codex — "reroute" là tên gọi gây hiểu nhầm.** Toàn bộ enum chỉ có **một** biến thể:
```
$ grep -A2 'enum ModelRerouteReason' codex-rs/protocol/src/protocol.rs
pub enum ModelRerouteReason {
    HighRiskCyberActivity,
}
```
Đó là **hạ cấp model vì an toàn nội dung**, không phải provider chết. 20 file chứa `Reroute` nhưng
`codex-rs/core/src/session/mod.rs:4025` là nơi duy nhất phát ra nó. → **codex không có provider-failure fallback.**

**opencode — chỉ chuyển model thủ công.** `switchModel` tồn tại (`session/session.ts:97`) nhưng là API do
người dùng/plugin gọi, không tự kích hoạt khi lỗi. Chỉ 12/… file trong `core/src` nhắc `fallback`.

**pi — fallback lúc resolve, không lúc chạy.** `model-resolver.ts:587` `buildFallbackModel` dùng khi
*tên model người dùng gõ không tồn tại trong catalog*:
> `Model "${fallbackPattern}" not found for provider "${provider}". Using custom model id.`

**gajae** — 60 file trong `ai/src` có `fallback|retry|backoff`; trọng tâm là retry provider
(`openai-compat.ts` 20, `anthropic.ts` 55, `auth-gateway/server.ts` 15).

> **Cả năm repo đều thiếu một thứ:** tự động đổi sang model *khác* khi provider *đã chết hẳn* (hết hạn mức
> toàn tài khoản, model bị gỡ khỏi upstream). omp xoay credential, còn lại thì không ai xoay model.

---

## 4. Có repo nào làm thứ omp KHÔNG làm không

**Có, ba repo — nhưng đều làm nó *thay* cho lớp chính sách, không bổ sung.**

**opencode: mới hơn và rộng hơn đáng kể.**
| | omp | opencode |
|---|---|---|
| provider | 73 | **223** |
| model | 5.522 | **8.179** |
| độ trễ đồng bộ | cache 2h | **5 phút** |
Đổi lại: **0 dòng chính sách.** 4,7 MB `snapshot.txt` là JSON của models.dev, lấy nguyên si. Không có
taxonomy, không có cascade, không có trục ưu tiên. Mọi id đến từ upstream thì lấy nguyên.

**pi: chính sách viết tay trong codegen.** 3.545 dòng TS chứa override, thay vì 221 file KDL. Đổi chính
sách = sửa TypeScript rồi chạy lại, cần mạng. Chính sách ở đó cũng **không commit**.

**gajae: đây là phát hiện quan trọng nhất của cả bài so sánh.**

```
$ find . -name '*.kdl' -not -path './node_modules/*' | wc -l   → 0
$ git ls-files | grep -E 'rules\.json|compat/rules'           → (rỗng)
```
Nhưng nó có **cùng tên file** với omp — `provider-models/bundled-references.ts`, `descriptors.ts`,
`openai-compat.ts`, `model-cache.ts`, `model-manager.ts`. Đây là một nhánh cùng huyết thống, đã gỡ KDL.

Và hậu quả nhìn thấy được. `packages/ai/src/model-pricing.ts` — 101 dòng, đúng thứ mà AGENTS.md của
omp cấm tuyệt đối:
```ts
const GPT_5_6_SOL_PRICING: TieredPricing = { cost: { input: 5, output: 30, ... } };
const GPT_6_ASTRA_PRICING: TieredPricing = { cost: { input: 10, output: 50, ... } };
const GPT_6_SOL_PRICING: TieredPricing = { cost: { input: 2, output: 10, ... } };
const GPT_6_LUNA_PRICING: TieredPricing = { cost: { input: 0.1, output: 0.5, ... } };
```
`model-thinking.ts` (1.179 dòng) chứa **86 id model hardcode** dạng chuỗi, và không có lớp identity nào
(`git ls-files | grep -iE '(identity|classif|collapse|expand)'` → rỗng). Chính sách bị **rải rác thành
hằng số TS**, đúng cái mà kiến trúc KDL sinh ra để tránh.

> **gajae là phép thử tự nhiên của câu hỏi "đừng phá KDL".** Câu trả lời đo được: gỡ KDL đi thì chính
> sách phải nhồi vào TypeScript, không còn tra cứu được, không còn tranh chấp phát hiện được
> (`AmbiguousOverlapError` của omp), và phải chịu phụ thuộc mạng lúc build. **Đừng phá KDL.**

---

## 5. Rust có đổi bức tranh không (codex)

**Không — ở tầng model/provider, Rust không đem lại lợi thế nào; nó chỉ đổi chỗ đặt vấn đề.**

Bằng chứng:

- **Quy mô model nhỏ hơn hẳn.** 4.925 file Rust nhưng chỉ **10 model / 5 provider**. So sánh cùng đường
  dữ liệu: opencode 8.179 model / 46 provider module, omp 5.522 / 73. Chi phí biên dịch Rust không đổi
  được tỉ lệ đó — 5 provider là một **quyết định phạm vi**, không phải giới hạn ngôn ngữ.

- **Codex từ chối chủ động làm việc đó.**
  `codex-rs/model-provider-info/src/lib.rs:660-664`:
  > *"We do not want to be in the business of adjudicating which third-party providers are bundled with
  > Codex CLI, so we only include the OpenAI and open source ("oss") providers by default. Users are
  > encouraged to add to `model_providers` in config.toml to add their own providers."*

  Đó là lựa chọn phạm vi, viết bằng Rust cũng vậy.

- **Rust không mua được tầng cache mà omp đã có.** `manager.rs:85-92`:
  ```rust
  pub enum RefreshStrategy { Online, Offline, OnlineIfUncached }
  ```
  giống hệt `ModelRefreshStrategy = "online" | "offline" | "online-if-uncached"` của omp
  (`model-manager.ts:25`), cộng ETag revalidation (`cache.rs:56,161-170`). **Hai bên độc lập hội tụ về
  cùng một thiết kế.** Việc Rust tự nó không tạo ra lợi thế; lợi thế nằm ở việc ai chịu viết tầng đó.

- **Điểm Rust *có* thắng: an toàn bản dịch.** `models.json` được nhúng bằng `include_str!` và parse tại
  compile → không thể lệch schema với binary đã build. Đây là lợi thế thật, nhưng thuộc loại *distribution*,
  không thuộc loại *model policy* — và omp đã đạt bằng `bun run gen:compat` + test tương đương
  (`packages/catalog/scripts/equivalence.ts`, 889 dòng).

- **Điểm Rust *thua*:** không có tầng chính sách. `models.json` của codex có 51 khoá/model rất giàu, nhưng
  là JSON viết tay không sinh tự động — mỗi model mới là một lần sửa tay trong Rust repo, không có
  compiler bắt trùng, không có `priority=` giải quyết trùng cấp. omp có 2.815 dòng compiler làm đúng việc đó.

**Kết luận câu 5:** Rust là một lựa chọn hợp lý cho codex (agent server, sandbox, protocol), nhưng ở
tầng này nó **trung lập**. Đừng dùng "codex làm bằng Rust" làm lập luận để đổi kiến trúc của omp.

---

## omp thiếu gì

Đã kiểm, không suy đoán. "Không có" ở đây là kết quả đo.

1. **Độ phủ provider/model thấp hơn opencode rõ rệt** — 73/5.522 so với 223/8.179. Nếu người dùng dùng
   provider chỉ có ở models.dev, omp không có nó. Đây là khoảng trống thật, đo được.

2. **Độ trễ đồng bộ chậm hơn 24 lần** — cache 2h (`DEFAULT_CACHE_TTL_MS = 2*60*60*1000`) so với opencode
   5 phút. Model mới lên giá hoặc giá đổi, omp chậm tối đa 2 giờ mới thấy.

3. **Chưa có fallback sang model khác** khi toàn bộ credential của một provider hết hạn mức. Hiện tại
   omp chỉ xoay credential. Cả bốn repo tham chiếu cũng thiếu — nên đây là khoảng trống chung, không phải
   lỗi so sánh.

4. **Dữ liệu model không commit ở pi, nhưng omp thì có** — đây là điểm omp *thắng*, không phải thiếu.
   Ghi lại để không ai "sửa" omp theo hướng ngược lại.

5. **Chưa đo được** chi phí bảo trì 221 file KDL khi upstream đổi metadata (thiếu số liệu thời gian —
   xem `## Chi phí`).

---

## Kết luận

### `không làm`

- **Không phá tầng KDL.** gajae (cùng huyết thống, 0 file `.kdl`) đã chứng minh bằng số: chính sách
  chuyển thành hằng số TS trong `model-pricing.ts` (101 dòng) và 86 id hardcode trong
  `model-thinking.ts` (1.179 dòng). Không còn tra cứu được, không còn compiler bắt trùng.
- **Không chuyển chính sách sang TypeScript** vì lý do "gọn hơn" — đó chính là hướng gajae đã đi và đã
  tạo ra kỹ thuật nợ.
- **Không chuyển sang Rust** vì lý do codex là Rust. Ở tầng này Rust trung lập: 10 model/5 provider,
  không có tầng chính sách, không có giá.
- **Không lấy opencode làm chuẩn về độ phủ.** 223 provider nhưng 0 dòng chính sách — sẽ mất 8.909
  dòng KDL để đổi lấy dữ liệu thô.

### `làm`

1. **Rút kinh nghiệm cache ladder từ codex** — không phải để chuyển sang Rust, mà vì codex và omp đã
   độc lập hội tụ về cùng một hình dạng (`Online/Offline/OnlineIfUncached` + ETag revalidation).
   Hội tụ độc lập là bằng chứng mạnh rằng thiết kế này đúng; giữ nguyên, chỉ cần **hạ TTL 2h xuống** để
   khớp opencode. Đây là thay đổi nhỏ, rủi ro thấp, lợi ích rõ (xem `làm nếu có điều kiện` #1).

### `làm nếu có điều kiện`

1. **Hạ `DEFAULT_CACHE_TTL_MS` từ 2h → 15-30 phút** *nếu* đo được rằng ngân sách mạng cho phép.
   opencode làm 5 phút. Điều kiện: cần số đo băng thông/bình phương của `model-cache.ts` trước.
   *Không* sửa nếu chưa đo — hiện tại 2h có thể là quyết định đã cân nhắc.

2. **Bổ sung provider cho các provider chỉ có ở models.dev** *nếu* có người dùng thật cần. Cách làm
   đúng theo kiến trúc hiện tại: thêm file `.kdl` vào `rules/providers/`, chạy `bun run gen:compat`,
   commit `rules.json` cùng `.kdl`. **Không** sửa `models.json` bằng tay (file sinh).

3. **Cân nhắc fallback sang model khác khi provider cạn** *nếu* có nhu cầu. Không ai trong năm repo làm
   được, nên đây là điểm khác biệt tiềm năng — nhưng phải làm theo KDL (một trục `fallback-model` trong
   `runtime/behavior.kdl`), không phải một `if` trong TS.

4. **Bổ sung `timeBased`/`longContext` cho model còn thiếu** *nếu* upstream có công bố. Hiện 35 model có
   `longContext`, 4 có `timeBased` trong tổng 5.522 — có thể đã đủ, cần đối chiếu danh sách giá thực tế
   của các provider mới trước khi động vào.

---

## Chi phí

**Đo được (chi phí đã chịu):**

| hạng mục | quy mô |
|---|---|
| Cây KDL | 221 file, 8.909 dòng |
| Compiler KDL | 2.815 dòng (`scripts/compat-compiler/`) |
| `rules.json` sinh ra | 319.653 byte (phải commit cùng `.kdl`) |
| `models.json` sinh ra | 5.522 model, 73 provider |
| Tầng khám phá | 15.542 + 9.206 = 24.748 dòng |
| Tầng fallback/credential | 17.806 dòng |
| **Tổng tầng model/provider của omp** | **~53.500 dòng** |

**Đề xuất (ước tính, chưa đo thời gian):**

| việc | ướng tính |
|---|---|
| Hạ TTL 2h → 30 phút | ~1 dòng hằng số + 1 test; **< 1 giờ** |
| Thêm N provider mới (theo chuẩn KDL) | ~30-130 dòng `.kdl` / provider + `bun run gen:compat`; **vài giờ cho 5 provider** |
| Trục `fallback-model` trong KDL | thiết kế ~1-2 ngày, cộng compiler + test resolve |
| Bổ sung `longContext`/`timeBased` còn thiếu | theo số model thực tế cần sửa; rẻ, nhưng cần đối chiếu giá upstream |

**Chưa đo được — cần đo trước khi quyết:**

- **Chi phí bảo trì 221 file KDL khi upstream đổi metadata.** Đây là câu hỏi lớn nhất và tôi **không có
  số liệu**. Cần đo: trong 3 tháng qua, `git log --oneline -- packages/catalog/src/compat/rules/` cho
  ra bao nhiêu commit, bao nhiêu là sửa chấn đoán upstream, trung bình mỗi lần sửa bao nhiêu dòng.
  Không có số này thì mọi lập luận "KDL đáng giá" chỉ là lập luận từ quan niệm.
- **Chi phí port từ pi.** Vì omp là hậu duệ của pi, phần có thể chép cơ học là lớp `ai/`; phần *không* thể
  chép là `catalog/` vì omp đã tiến xa hơn pi rất xa (73 provider + KDL so với 42 provider không KDL).
  Đây là lý do commit `1dd1e87` nói "make future copies from pi mechanical" — và lý do miền catalog
  phải loại riêng.
