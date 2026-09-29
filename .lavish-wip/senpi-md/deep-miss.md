# HA THIẾU — đặc tả port cho những gì `omp` THIẾU HẢN

> Nghiên cứu M5, vòng sửa. Viết **2026-09-28**.
> Mọi khẳng định kèm **lệnh đã chạy + đường dẫn + số dòng**. "Không có" là phát hiện có giá trị — nhưng
> phải phân biệt với "không đo được". Mục 0 nói rõ cái nào là cái nào.
>
> **Cây đo:**
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref
> OMP=/Users/tranquangdang21/Projects/ultraworkers
> PI=/Users/tranquangdang21/Projects/pi-ref
> ```
>
> **Đã đọc trước khi viết (đúng ba file, theo chỉ định):** `changes-md.md` (487 dòng) ·
> `builtins.md` (423 dòng) · `deep-risk.md` (978 dòng). Không đọc thêm file nào trong `senpi-md/`.
>
> **Ghi chú về ngân sách:** bài này dùng ~40 lệnh shell. Nhiều hơn mức cần, nhưng dưới trần 60.

---

## 0. SAI LẦM CỦA BA BÀI TRƯỚC — đọc mục này trước khi tin bất cứ bảng nào

### 0.1 🔴 `\b` KHÔNG HOẠT ĐỘNG TRONG `git grep -E` TRÊN macOS → ba bài trước đã kết luận sai

`changes-md.md` §5d, `builtins.md` §4.2, `deep-risk.md` §6.1 đều viết:

> `builtin/btw` → `git grep -E '\bbtw\b' -- packages/...` → **0 hit** → "ứng viên port số 1".

**Đo lại trên máy này:**

```bash
$ printf 'btw foo\nfoo btw\n' > /tmp/bwttest.txt
$ grep -E '\bbtw\b' /tmp/bwttest.txt
btw foo
foo btw                      # ← chạy, nhưng KHÔNG phải vì \b

$ grep -w 'btw' /tmp/bwttest.txt
btw foo
foo btw
```

Hai lệnh trên cho cùng kết quả trên file 2 dòng — chưa chứng minh. Lệnh mới quyết định:

```bash
$ cd /Users/tranquangdang21/Projects/ultraworkers
$ git grep -w 'btw' -- packages/coding-agent/src | wc -l
52
$ git grep -E '\bbtw\b' -- packages/coding-agent/src | wc -l
0
```

**Cùng một từ khóa, hai cách viết, chênh lệch 52 về 0.** Kết quả **0** là phép đo hỏng, không phải phát hiện.
`git grep` trên macOS dùng regex của hệ thống, ở đó `\b` bị hiểu thành backspace (ký tự `\b` trong C), nên
`\bbtw\b` không bao giờ khớp chuỗi nào.

**Suy ra ra quy tắc dùng cho phần còn lại của bài này:**

| Tìm symbol trong omp | Dùng lệnh này | Không dùng |
|---|---|---|
| tên hàm/biến | `git grep -w '<tên>' -- <path>` | `git grep -E '\b<tên>\b'` |
| tên có dấu `.` (`pi.rpc`) | `git grep -w -F 'pi.rpc'` | regex |
| đường dẫn | `git ls-files \| grep -i '<mẫu>'` | `git ls-files '<pathspec>'` (tương đối với cwd) |

Cả hai bẫi này đều **sinh ra kết quả rỗng**, và kết quả rỗng rất dễ đọc thành "omp không có".
`builtins.md` §0 đã cảnh báo bẫy `git ls-files` pathspec; đây là bẫy thứ hai, cùng hệ quả.

### 0.2 Hệ quả: `/btw` KHÔNG phải hạng mục "thiếu" — omp đã có, và lớn hơn senpi

```bash
$ git -C $OMP ls-files | grep -i btw | grep -v test
packages/coding-agent/src/modes/controllers/btw-controller.ts
packages/coding-agent/src/prompts/system/btw-user.md
packages/coding-agent/src/session/btw-history.ts
packages/tui/src/overlays/btw-panel.ts
packages/tui/src/overlays/btw-history-panel.ts
```

| | senpi `builtin/btw` | omp |
|---|---:|---:|
| dòng TS (không test) | **389** | — |
| `btw-controller.ts` | — | **708** |
| `btw-history.ts` | — | **216** |
| `btw-panel.ts` | — | **172** |
| `btw-history-panel.ts` | — | **598** |
| prompt | trong `.ts` | `prompts/system/btw-user.md` (8 dòng) |
| **tổng (không test)** | **389** | **1.694** |

**omp có `/btw` lớn gấp 4,3 lần, và prompt nằm ở file `.md` đúng chuẩn `AGENTS.md` — trong khi senpi để
prompt trong `.ts`.** Đây là trường hợp *ngược* với `prompt-preset`: ở đó omp phải viết lại vì senpi vi phạm,
ở đây **senpi mới là bản cần viết lại**.

Bằng chứng omp có cả seam side-turn đã mở cho extension:
```bash
$ git -C $OMP grep -n 'side turn' -- packages/coding-agent/src/extensibility/extensions/types.ts
498:	/** Run a /btw-style side turn without appending to history or executing tool calls.
501:	 * Hooks reached within a running side turn cannot start another one (bounded recursion).
502:	 * Optional for compatibility with hosts that do not provide side turns.
```

→ **`/btw` rớt khỏi danh sách "làm ngay".** Không phải vì không đáng, mà vì **đã có và đã hơn**.

### 0.3 Sai thứ ba: `cache-keepalive` không "thiếu hạ tầng" như `builtins.md` §5 nói

`builtins.md` §5 đo `git ls-files 'packages/ai/src/**/prompt-cache*'` → rỗng, kết luận
*"omp có zero file prompt-cache trong packages/ai"*. **Sai — vì lại dùng pathspec sai (§0 của chính file đó).**

Đo lại:

```bash
$ git -C $OMP grep -rln 'cache_control' -- packages/ai/src | head -9
packages/ai/src/auth-gateway/server.ts
packages/ai/src/auth-gateway/types.ts
packages/ai/src/providers/anthropic-messages-server-schema.ts
packages/ai/src/providers/anthropic-messages-server.ts
packages/ai/src/providers/anthropic-wire.ts
packages/ai/src/providers/anthropic.ts            ← 5.957 dòng
packages/ai/src/providers/openai-completions.ts   ← 2.719
packages/ai/src/providers/openai-responses.ts     ← 1.536
packages/ai/src/stream.ts                         ← 2.579
```

Và omp **đã có cả trục policy**:
```bash
$ git -C $OMP grep -rn 'type CacheRetention' -- packages
packages/ai/src/types.ts:124:export type CacheRetention = "none" | "short" | "long";
$ git -C $OMP grep -rn 'promptCacheMode' -- packages/catalog/src/compat/axes.ts
packages/catalog/src/compat/axes.ts:218:	"prompt-cache-mode": wire("promptCacheMode", ["bedrock"], "scalar", ["none", "automatic", "explicit"]),
```

`prompt-cache-mode` **đã là một axis KDL** trong catalog của omp.

**Vậy `cache-keepalive` còn thiếu gì?** Không phải hạ tầng cache, mà **đúng hai hàm**:

| hàm của senpi | omp | nơi senpi định nghĩa |
|---|---|---|
| `warmPromptCache` | **0 hit** | `packages/ai/src/utils/prompt-cache-ttl.ts` |
| `resolvePromptCacheTtlSeconds` | **0 hit** | cùng file, dòng **473** (file 476 dòng) |
| `getPromptCacheSafeWaitSeconds` | **0 hit** | `ExtensionContext` |
| `getPromptCachePrefixRequest` | **0 hit** | `ExtensionContext` |
| `prepareProviderRequest` | **0 hit** | `ExtensionContext` |
| `isIdle()` | **50 hit** | `types.ts:478` ✅ có |
| `hasPendingMessages()` | **38 hit** | `types.ts:482` ✅ có |
| `appendEntry` | **56 hit** | ✅ có |
| `getAllTools` / `getActiveTools` | 35 / 44 hit | ✅ có |
| `registerEntryRenderer` | **0 hit** | ⚠️ thiếu cả API |

```bash
$ git -C $OMP grep -n 'isIdle\|hasPendingMessages' -- packages/coding-agent/src/extensibility/extensions/types.ts
478:	isIdle(): boolean;
482:	hasPendingMessages(): boolean;
1770:	isIdle: () => boolean;
1772:	hasPendingMessages: () => boolean;
```

→ **Kết luận đảo ngược so với `builtins.md`:** `cache-keepalive` rẻ hơn nhiều so với tưởng, vì
omp đã có sẵn toàn bộ tầng dưới. Nó chỉ thiếu **2 hàm ở `packages/ai` + 1 API `registerEntryRenderer`**.
Xem đặc tả ở mục 1.

---

## 1. Bảng tổng — xếp theo công / giá

Mỗi mục có mức: `làm ngay` / `làm nếu có seam` / `không đáng`.

| # | Hạng mục | senpi (dòng) | omp hiện tại | Mức | Công |
|---:|---|---:|---|---|---|
| 1 | [Warm prompt cache + TTL resolver](#11-warm-prompt-cache--ttl-resolver) | 483 TS + 476 `pi` | thiếu 2 hàm | **làm ngay** | tiết kiệm tiền thật mỗi lượt |
| 2 | [`registerEntryRenderer` + `model_select` + 3 API session](#12-seam-api-extension--20-dòng--làm-ngay) | 0 (là hành lang) | **0 hit cả 4** | **làm ngay** | mở khóa 16 builtin |
| 3 | [`tool-pair-guard`](#13-tool-pair-guard--làm-nếu-có-seam) | 269 | 0 | **làm nếu có seam** | vá lỗi wire 500 |
| 4 | [`look-at` (model thị giác riêng)](#14-look-at--làm-nếu-có-seam) | 922 | 0 | **làm nếu có seam** | ảnh không phá context |
| 5 | [`config-reload`](#15-config-reload--không-đáng-lúc-này) | 2.317 | 0 | **không đáng** | (đã có ở dạng khác) |

**Từ 40 builtin của senpi, sau khi đo lại: còn đúng 4 hạng mục "thiếu hẳn".** Không phải 6 như
`deep-risk.md` §8.2 liệt kê, vì `btw` rơi (đã có, mục 0.2) và `loop-guard` / `history-search` / `bash-timeout`
rơi (kiểm ở mục 2).

---

## 1.1 Warm prompt cache + TTL resolver — **làm ngay**

**Vì sao đáng:** mỗi lượt không đọc được cache là một lần trả **giá input đầy đủ**. Với session dài, đây là
khoản chi lớn nhất ngoài chính số token sinh ra. Và quan trọng hơn: **tầng dưới omp đã có sẵn** (mục 0.3),
nên đây là phần bù nhỏ trên nền lớn — tỉ lệ giá/giá trị cao nhất trong toàn bộ danh sách.

### Nguồn ở senpi

| file | dòng | vai trò |
|---|---:|---|
| `builtin/cache-keepalive/index.ts` | **340** | vòng lặp ping: arm → hẹn giờ → ping → đo cache read/write → arm lại |
| `builtin/cache-keepalive/session-prewarm.ts` | **110** | prewarm **một lần** lúc `session_start`, tách rời pipeline lượt |
| `builtin/cache-keepalive/prewarm-entry.ts` | **33** | kiểu dữ liệu entry của prewarm |
| `packages/ai/src/utils/prompt-cache-ttl.ts` | **476** | `resolvePromptCacheTtlSeconds` ở dòng **473**; `isAnthropicApiBaseUrl` ở dòng **47** |
| `packages/ai/src/api/anthropic-tool-pairs.ts` | 196 | *(không thuộc hạng mục này — xem 1.3)* |

```bash
$ find /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin/cache-keepalive \
    -name '*.ts' ! -path '*/test/*' -exec wc -l {} \;
  340 cache-keepalive/index.ts
   33 cache-keepalive/prewarm-entry.ts
  110 cache-keepalive/session-prewarm.ts
```

### Cơ chế (đọc `index.ts:104-140`)

Vòng lặp không phải "ping đều đặn". Nó **tính ngược từ TTL**:

```
intervalMs = getPromptCacheSafeWaitSeconds() - settings.marginSeconds
delayMs    = lastCompletedAtMs + intervalMs - Date.now()
setTimeout(delayMs) → ping() → đo cacheRead/cacheWrite → quyết định có arm tiếp không
```

Bốn điều kiện phải đúng mới arm (`index.ts:108-120`):
1. `parked === false` **và** không có timer đang chạy **và** không có request in-flight
2. `settings.enabled` **và** `ctx.model` có mặt **và** đã có ít nhất một lượt hoàn tất (`lastCompletedAtMs`)
3. `isWarmSupportedModel(current.model)` — chỉ provider nào thật sự hỗ trợ mới ping
4. `ctx.isIdle()` **và** `!ctx.hasPendingMessages()` — không được chen vào lúc người dùng đang gõ

Nếu (3) hoặc (4) sai → `stop("agent-busy")` / `stop("pending-messages")`, không ping.

**Hai chốt an toàn chi phí** (`index.ts:121-127`):
```typescript
if (attempts >= Math.max(0, settings.maxRequestsPerSession)) { stop("max-requests", true); return; }
const projectedUsd = projectedPingCost(current.model, lastUsage);
if (cumulativeEstimatedUsd + projectedUsd > Math.max(0, settings.maxCostUsdPerSession)) {
    stop("cost-cap", true); return;
}
```
→ **Không bao giờ ping vô hạn.** Đây là mẫu cần giữ nguyên khi port: một extension tự gọi provider
mà không có trần chi phí là một lỗ hổng tài chính, không phải một tiện ích.

Có thêm `generation` counter để hủy timer cũ khi `stop()` chạy giữa chừng (`index.ts:71,84,92`).

### Hook/API của extension cần có

Đã có sẵn trong omp — **không phải viết mới**:
```bash
$ git -C $OMP grep -n 'isIdle\|hasPendingMessages' -- packages/coding-agent/src/extensibility/extensions/types.ts
478:	isIdle(): boolean;
482:	hasPendingMessages(): boolean;
$ git -C $OMP grep -w 'appendEntry' -- packages/coding-agent/src/extensibility/extensions/types.ts
1489:	appendEntry<T = unknown>(customType: string, data?: T): void;
```

Thiếu, phải thêm vào `ExtensionContext` (mỗi cái ~8–15 dòng):
| seam | ý nghĩa |
|---|---|
| `getPromptCacheSafeWaitSeconds(): number \| undefined` | TTL thực của model đang chạy, đã trừ jitter |
| `getPromptCachePrefixRequest(opts?): Promise<PrefixResult>` | dựng request tiền tố để prewarm |

Và một helper ở `packages/ai`:
| hàm | quy mô |
|---|---|
| `resolvePromptCacheTtlSeconds(model, env?): number \| undefined` | ~15 dòng, dùng axis `prompt-cache-mode` + `CacheRetention` đã có |
| `warmPromptCache(model, context, opts?)` | ~40 dòng, gọi provider 1 lượt tối thiểu và trả `cacheRead/cacheWrite` |

### Phụ thuộc

- **Không thêm package.** Dùng `packages/ai` sẵn có.
- Không thêm dependency ngoài.

### Cỡ công ước lượng

| việc | senpi | omp ước lượng | lý do khác |
|---|---:|---:|---|
| `resolvePromptCacheTtlSeconds` | (trong 476 dòng) | **~20** | omp có `CacheRetention` + axis `prompt-cache-mode` sẵn, không cần bảng tra |
| `warmPromptCache` | (trong 476 dòng) | **~50** | |
| `getPromptCacheSafeWaitSeconds` + `getPromptCachePrefixRequest` | — | **~35** | 2 method trên `ExtensionContext` + implementation |
| extension `cache-keepalive` | 483 | **~330** | bỏ phần OpenAI prewarm nếu chưa cần (xem dưới) |
| **tổng** | | **~435** | |

> **Cắt được phần nào:** `session-prewarm.ts` (110 dòng) là prewarm cho **OpenAI GPT-5.6+** —
> điều kiện `isOpenAIResponsesPromptCacheModel` rất hẹp. Nếu M5 chưa cần, bỏ 110 dòng đó,
> chỉ giữ vòng ping Anthropic. Còn `index.ts` 340 dòng là phần lõi, nên giữ.

### Rủi ro khi chép — có vi phạm `AGENTS.md`, phải viết lại

| luật | vi phạm? | cách sửa |
|---|---|---|
| **Cấm hardcode model id** | ⚠️ **CÓ** — `isWarmSupportedModel()` và `isOpenAIResponsesPromptCacheModel()` đều là điều kiện theo provider | Chuyển thành truy vì axis `prompt-cache-mode` + `CacheRetention` của catalog. Không viết `model.id.includes("claude")`. |
| **Cấm viết prompt bằng TS** | ✅ không | extension này không sinh prompt; nó chỉ **tái sử dụng** `lastMessages` đã có |
| **Cấm `any`** | 🔴 **CÓ** — `deep-risk.md` §3.8 đo **9 `any`**, nhiều nhất cây builtin. Xuất hiện ở `Model<any>` (senpi's own generic) | Dùng `Model<Api>` như mọi nơi khác trong omp |
| **Cấm `ReturnType<>`** | 🔴 **CÓ** — 1 chỗ: `let timer: ReturnType<typeof setTimeout>` (`index.ts:70`) | `Timer` handle của Bun, hoặc khai kiểu cụ thể |
| **Cấm inline import** | ✅ không | |
| **`private` keyword** | ✅ không | senpi dùng closure, không class |
| **`console.*`** | ✅ không | |
| **TUI sanitize** | 🔴 **CÓ** — `renderCacheKeepAliveEntry` (`index.ts:46-53`) in chuỗi tự dựng | Phải qua `truncateToWidth` + `replaceTabs`. Và `formatUsd`/`formatWarmTokenCount` phải là helper của omp, không phải bản sao. |

**Kết luận:** viết lại ~435 dòng. Không chép dòng nào. Đây là hạng mục **rẻ nhất trên mỗi dòng công sức**
trong toàn bộ danh sách, vì phần lõi (`packages/ai`) đã có sẵn.

---

## 1.2 Seam API extension — ~20 dòng — **làm ngay**

Đây không phải một builtin. Đây là **ba lỗ hổng trong `ExtensionAPI` của omp** mà 17 builtin của senpi
đang dựa vào. Không vá thì **mọi** builtin có điều kiện theo model đều không port được.

### Seam 1 — `model_select` (nút thắt số 1)

omp có **45 event**:
```bash
$ git -C $OMP grep -ohE 'event: "[a-z_]+"' packages/coding-agent/src/extensibility/extensions/types.ts | sort -u | wc -l
45
$ git -C $OMP grep -ohE 'event: "[a-z_]+"' packages/coding-agent/src/extensibility/extensions/types.ts | grep -iE 'model|thinking|tier'
(rỗng)
```

→ **Không event nào báo "model đã đổi".** Mà 17 builtin của senpi dùng nó:
```bash
$ grep -rlw 'model_select' .../builtin --include='*.ts' | sed 's|.*/builtin/||' | cut -d/ -f1 | sort -u | tr '\n' ' '
anthropic-subscription anthropic-web-search ask-user cache-keepalive compaction
gpt-apply-patch look-at openai-image-gen openai-web-search prompt-preset reasoning
recommended-models service-tier.ts terminal video-in websearch
```

Kiểu event ở senpi (`types.ts:1355-1372`):
```typescript
export type ModelSelectSource = "set" | "cycle" | "restore" | "fallback" | "fallback-revert";

export interface ModelSelectEvent {
	type: "model_select";
	model: Model<any>;
	previousModel: Model<any> | undefined;
	source: ModelSelectSource;
	/** The active system prompt before model_select handlers run. */
	systemPrompt: string;
	/** Structured options used to build the base system prompt. */
	systemPromptOptions: BuildSystemPromptOptions;
}

export interface ModelSelectEventResult {
	/** Replace the active system prompt after the model switch. `null` resets to the base senpi prompt. */
	systemPrompt?: string | null;
	/** Human-readable name for the prompt that became active. */
	systemPromptName?: string;
}
```

**Việc cần làm trong omp (~15 dòng):** khai event + result như trên (bỏ `Model<any>` → `Model<Api>`),
và phát nó ở **mọi** đường đổi model. `source` phải phân biệt được 5 nguồn, nếu không thì extension
không biết mình đang bị fallback hay người dùng chủ động chọn — mà hai trường hợp đó cần hành vi khác nhau.

**Kiểm chứng sau khi làm:** `setModel` (types.ts:1507) chính là một trong các đường đó. Hiện tại
`setModel` **không** phát sự kiện nào cho extension → extension không thể phản ứng.

### Seam 2 — `setSessionFastMode`

`deep-risk.md` §2.2 B3 nói omp thiếu 3 hàm `setSessionModel` / `setSessionFastMode` / `setSessionThinkingLevel`,
và `service-tier.ts` dùng `setSessionFastMode` 8 lần. **Đo lại:**

| hàm | omp | vị trí |
|---|---|---|
| `setSessionModel` | ✅ có, tên `setModel` | `types.ts:1507` |
| `setSessionThinkingLevel` | ✅ có, tên `setThinkingLevel` | `types.ts:1513` |
| `setServiceTier` | ✅ có (generic theo family) | `types.ts:1522` |
| `setSessionFastMode` | ⚠️ **không có** — nhưng `setServiceTier` phủ được | `types.ts:1522` |

```bash
$ git -C $OMP grep -n 'setModel(\|setThinkingLevel(\|setServiceTier' packages/coding-agent/src/extensibility/extensions/types.ts
1507:	setModel(model: Model): Promise<boolean>;
1513:	setThinkingLevel(level: ThinkingLevel): void;
1522:	setServiceTier<Family extends ServiceTierFamily>(
```

→ **Sai lần thứ ba của bộ tài liệu trước.** omp đã có cả ba dưới tên khác. Khi port `service-tier.ts` của
senpi (17 KB), chỉ cần **đổi tên**, không cần thêm API.

### Seam 3 — `registerEntryRenderer`

senpi tách **entry** (dòng log của extension) khỏi **message** (bong bóng hội thoại). omp chỉ có message:
```bash
$ git -C $OMP grep -n 'registerMessageRenderer' packages/coding-agent/src/extensibility/extensions/types.ts
1450:	registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;
$ git -C $OMP grep -w 'registerEntryRenderer' -- packages
0 hit
```

**Không cần thêm API mới.** `appendEntry` (types.ts:1489) đã có; chỉ thiếu chỗ **render**.
→ Câu hỏi cần trả lời khi implement: entry có nên đi qua `registerMessageRenderer` luôn, hay cần
bản riêng? Xem "Câu hỏi mở" ở mục 4.

### Cỡ công & rủi ro

| việc | dòng |
|---|---:|
| `model_select` event + phát ở 5 đường đổi model | ~20 |
| `setSessionFastMode` alias (nếu muốn tên của senpi) | ~5 |
| **tổng** | **~25** |

**Vi phạm `AGENTS.md`:** không có. Đây là khai báo kiểu + một lệnh phát sự kiện.
Duy nhất: dùng `Model<Api>` chứ không phải `Model<any>`.

**Vì sao "làm ngay" dù giá chỉ 25 dòng:** nó là **điều kiện tiên quyết** của mục 1.1 và 1.4.
`cache-keepalive` cần biết model có hỗ trợ warm không; `look-at` cần bật/tắt tool khi model đổi.
Không có seam này thì hai mục đó phải poll.

---

## 1.3 `tool-pair-guard` — **làm nếu có seam** (đã trả lời câu hỏi ở mục 3 — xem 1.3.1)

### Nguồn ở senpi

| file | dòng |
|---|---:|
| `builtin/tool-pair-guard/index.ts` | **15** |
| `builtin/tool-pair-guard/sanitize-openai-responses-payload.ts` | **149** |
| `builtin/tool-pair-guard/sanitize-openai-chat-completions-payload.ts` | **105** |
| `packages/ai/src/api/anthropic-tool-pairs.ts` (không nằm trong builtin) | **196** |

Toàn bộ extension chỉ 15 dòng — nó **không đăng ký gì**, chỉ gắn một hook:
```typescript
pi.on("before_provider_request", (event) => {
	const sanitizedAnthropicPayload = sanitizeAnthropicPayload(event.payload);
	const sanitizedResponsesPayload = sanitizeOpenAIResponsesPayload(sanitizedAnthropicPayload);
	const sanitizedPayload = sanitizeOpenAIChatCompletionsPayload(sanitizedResponsesPayload);
	if (sanitizedPayload === event.payload) return undefined;
	return sanitizedPayload;
});
```

Ba tầng sanitizer xếp chồng, một cho mỗi wire format. `sanitizeOpenAIResponsesPayload` xử lý
5 loại item (`function_call` / `local_shell_call` / `custom_tool_call` và 2 loại `*_output`)
và khi phát hiện tool_call mồ côi thì **chèn một kết quả giả**:
```typescript
const SYNTHETIC_OUTPUT = "Tool output unavailable (interrupted before result)";
```

### Seam trong omp — **đã có, không thiếu**

```bash
$ git -C $OMP grep -w 'before_provider_request' -- packages/coding-agent/src
runner.ts:  const handlers = ext.handlers.get("before_provider_request");
types.ts:  type: "before_provider_request";
types.ts:  event: "before_provider_request",
```

Cái **thiếu** là phần sanitize, không phải chỗ gắn:
```bash
$ git -C $OMP grep -w -l 'sanitizeAnthropicToolPairs\|toolPair\|orphanToolCall\|dangling_tool' -- packages/ai/src
0 file
$ git -C $OMP grep -n 'tool_use_id' -- packages/ai/src/stream.ts packages/ai/src/api
0 hit
```

### Cỡ công

| việc | omp ước lượng |
|---|---:|
| `sanitizeAnthropicToolPairs` (196 dòng của senpi) | **~180** — chép được gần nguyên xi, đây là **hàm thuần trên payload**, không có policy |
| `sanitizeOpenAIResponsesPayload` (149) | **~140** |
| `sanitizeOpenAIChatCompletionsPayload` (105) | **~100** |
| extension `index.ts` (15) | **~15** |
| **tổng** | **~435** |

> **Nói rõ để không tưởng là copy-paste:** `deep-risk.md` §5.3 nói đúng rằng
> `packages/ai/src/utils/tool-pair-repair.ts` **không có trong omp** → phải viết mới.
> Nhưng 435 dòng đó là **thuật toán trên cấu trúc JSON của provider**, không phải policy theo model.
> `AGENTS.md` cấm *policy theo model id*, không cấm *code biết mặt hình `function_call_output`*.
> → **Đây là hạng mục duy nhất trong danh sách gần với "chép được".**

### Rủi ro khi chép

| luật | vi phạm? | cách sửa |
|---|---|---|
| Cấm hardcode model id | ✅ **không** | sanitizer chỉ nhìn `type` của item, không nhìn tên model |
| Cấm `any` | ⚠️ `Record<string, unknown>` ở cả 2 file — **đây là đúng** | giữ nguyên; đây là `unknown` có kiểm soát, không phải `any` |
| Cấm `ReturnType<>` | ✅ không | |
| Cấm inline import | ✅ không | |
| TUI sanitize | ✅ không | không render ra TUI |
| **Test** | ⚠️ đây là **hàm thuần biến đổi payload** | `AGENTS.md`: *"One fixture MAY prove parse/render/normalize/encode/resolve behavior when output is computed"* — đúng loại này. Cần fixture: tool_call mồ côi → có output giả; tool_call/tool_result cân bằng → **payload không đổi** (negative contract); ba wire format riêng biệt |

### Vì sao "làm nếu có seam" chứ không phải "làm ngay"

Seam **đã có** (`before_provider_request` chạy được). Điều kiện còn lại là **quan trọng hơn giá**:
`tool_use_id` không xuất hiện ở `stream.ts` hay `api/` của omp nghĩa là **chỗ sinh ra lệch cặp
chưa được xác định**. Nếu omp đã có cơ chế cắt ngang tool khác (cancel tool call giữa chừng →
provider thấy `tool_use` không có `tool_result` → **400**), thì đây là lỗi đang xảy ra và nên làm ngay.
Nếu omp đã cắt sạch, đây là phòng thủ cho wire format mới.

**Câu hỏi phải trả lời trước khi làm:** omp có đường nào tạo ra tool call không có result không?
Nếu có → nâng lên "làm ngay".

### 1.3.1 Trả lời câu hỏi đó — **omp ĐÃ có cơ chế, nhưng ở tầng khác**

`packages/ai/src/providers/cursor.ts` có hẳn một mô hình "tool call không có result":

```typescript
cursor.ts:3673: * call unpaired, and `buildSessionContext` strips a dangling call from every
cursor.ts:4446: // dangling call into every rebuilt transcript.
cursor.ts:2613: // `pairing` is required so a new callsite cannot silently recreate the orphan,
```

Tức là: **omp đã thừa nhận khái niệm "dangling tool call" và xử lý nó bằng cách *cắt khỏi transcript*
chứ không phải bằng cách *chèn output giả* vào payload.**

Đó là hai chính sách khác nhau trên cùng một tình huống:

| | senpi `tool-pair-guard` | omp `cursor.ts` |
|---|---|---|
| lúc nào | ngay trước khi gửi provider (`before_provider_request`) | khi dựng lại context |
| cách sửa | **chèn** `function_call_output` giả để cân bằng | **xoá** tool call mồ côi khỏi transcript |
| ưu điểm | giữ được lịch sử; provider không 400 | không gửi payload sai |
| đánh đổi | bịa ra nội dung tool result | mất dấu vết tool call đã phát ra |

**Chỉ `cursor.ts` được viết theo chính sách "xoá"; các provider khác không có.** Đó là lý do
`tool-pair-guard` đáng giữ ở mức "làm nếu có seam" chứ không phải "làm ngay": **omp đã trả lời câu hỏi
"có sinh tool call mồ côi không" — có, và đã có một cách xử lý. Việc còn lại là trải cách đó ra khỏi
`cursor.ts` cho mọi provider**, và đó là một quyết định chính sách, không phải một port.

**Việc cần làm trước tiên (rẻ, ~15 dòng):** đọc `cursor.ts:3660-3690` và `4430-4460` để hiểu
`buildSessionContext` loại dangling call theo quy tắc nào, rồi **tái sử dụng chính quy tắc đó**
thay vì viết `sanitizeAnthropicToolPairs` (196 dòng) từ đầu. Nếu quy tắc của omp đủ tốt,
công có thể giảm từ ~435 xuống ~120 dòng. **Đừng viết bản thứ hai của một thứ đã tồn tại.**

---

## 1.4 `look-at` — **làm nếu có seam**

### Nguồn ở senpi

| file | dòng | vai trò |
|---|---:|---|
| `look-at/index.ts` | **64** | đăng ký tool `look_at`, đồng bộ bật/tắt theo model |
| `look-at/runner.ts` | **162** | chạy lượt ở model thị giác, rút text ra |
| `look-at/arguments.ts` | **125** | chuẩn hoá + validate tham số |
| `look-at/render.ts` | **118** | renderer call/result |
| `look-at/commands.ts` | **117** | lệnh `/lookat` |
| `look-at/model-selector.ts` | **99** | chuỗi model thị giác + hậu tố `:thinking` |
| `look-at/prompts.ts` | **22** | mô tả tool + đoạn bơm vào system prompt |
| `look-at/image-input.ts` | **185** | nạp ảnh (path/URL/base64) |
| `look-at/settings.ts` | **30** | lưu chuỗi model đã chọn |
| **tổng** | **922** | |

### Ý tưởng
Ảnh đi qua **model thị giác riêng**, không nhét base64 vào lượt chính. Model chính không có `image`
trong `input` vẫn dùng được, và context lượt chính không phình.

Cơ chế bật/tắt (`index.ts:40-47`) — đây là phần hay nhất:
```typescript
const shouldBeActive =
	loadLookAtEnabled(ctx, store) &&
	ctx.model !== undefined &&
	!ctx.model.input.includes("image") &&                       // ← chỉ bật khi model chính KHÔNG nhìn được ảnh
	resolveVisionModel(loadLookAtChain(ctx, store), ctx.modelRegistry.getAvailable()) !== undefined;
```

→ Tool tự tắt khi model chính đã nhìn được ảnh. Không phí token thừa.

### Seam trong omp

| cần | omp | đo bằng |
|---|---|---|
| biết model có nhìn ảnh không | ✅ **có** | `model.input.includes("image")` — dùng ở `anthropic.ts:2235,4881,5071`, `google-shared.ts:191,281` |
| chọn model theo mẫu tên + hậu tố | ✅ **có, đúng y hệt** | xem 1.4.1 bên dưới |
| liệt kê model khả dụng | ✅ `ctx.modelRegistry.getAvailable()` | |
| bật/tắt tool khi model đổi | ❌ **thiếu** | cần `model_select` (mục 1.2) |
| chạy lượt không ghi history | ✅ **có** | `types.ts:498` mô tả `/btw`-style side turn — xem mục 0.2 |

**Điểm mấu chốt:** phần lớn hạ tầng omp đã có. Cái thiếu là `model_select` để bật/tắt tool,
và side-turn để chạy lượt thị giác mà không làm bẩn lượt chính.

### 1.4.1 `model-resolver.ts` của omp ĐÃ có `splitThinkingSuffix` — giảm ~100 dòng

Senpi viết `model-selector.ts` (99 dòng) vì thiếu seam. omp không thiếu:

```bash
$ git -C $OMP grep -n 'lastIndexOf(":")\|splitThinkingSuffix' packages/coding-agent/src/config/model-resolver.ts
17: *   grammar on top: trailing `:level` thinking suffixes (`splitThinkingSuffix`)
208:	const colonIdx = modelId.lastIndexOf(":");
213:	const suffix = modelId.slice(colonIdx + 1).trim();
217:	if (!suffix || parseThinkingSuffix(suffix, MAX_THINKING_SUFFIX_OPTIONS)) {
```

Dòng 17 nói rõ đây là **tính năng có sẵn**: `model-resolver.ts` đã cài grammar
`"<mô hình>:<mức thinking>"` — **đúng cái `splitThinkingSuffix` mà `look-at/model-selector.ts:29-38`
tự viết lại ở senpi**.

→ **`model-selector.ts` của `look-at` rút từ 99 dòng xuống ~30** (chỉ còn logic chọn theo chuỗi ưu tiên
+ phân giải id mơ hồ). Phần tử tưởng phải viết mới thực ra đã có.

### Cỡ công

| việc | omp ước lượng |
|---|---:|
| `model-selector.ts` (99) | **~30** — tái dùng `splitThinkingSuffix` của `model-resolver.ts` (1.4.1) |
| `runner.ts` (162) — chạy qua side turn | **~170** |
| `arguments.ts` (125) + `image-input.ts` (185) | **~250** (omp có sẵn phần đọc ảnh — `src/tools/` đã xử lý ảnh, cần kiểm để tái dùng) |
| `render.ts` (118) | **~90** — sau khi áp sanitize, ngắn hơn |
| `index.ts` + `commands.ts` + `prompts.ts` + `settings.ts` (233) | **~200** |
| **tổng** | **~740** (đã trừ ~70 sau khi đo lại 1.4.1) |

### Rủi ro khi chép — **vi phạm nặng nhất trong danh sách, sau `prompt-preset`**

| luật | vi phạm? | cách sửa |
|---|---|---|
| **Cấm hardcode model id** | 🔴 **CÓ, nghiêm trọng** — `model-selector.ts:8-13` khai `DEFAULT_LOOK_AT_CHAIN` là **4 model id cứng**: `"gpt-5.6-terra:off"`, `"gemini-3.1-pro-preview:low"`, `"gemini-3.5-flash"`, `"kimi-k3"` | Đây đúng thứ `AGENTS.md` gọi là *per-model lookup table*. Phải viết thành **trục KDL** (ví dụ `vision-preference`) trong `classes/*.kdl`, người dùng override qua settings. `model-selector.ts:14` còn có `AMBIGUOUS_ID_PROVIDER_PREFERENCE = ["openai","google","moonshotai"]` — cũng là hardcode provider, cũng phải đi. |
| **Cấm viết prompt bằng TS** | 🔴 **CÓ** — `prompts.ts` (22 dòng) chứa `LOOK_AT_DESCRIPTION` + `LOOK_AT_PROMPT_SNIPPET` | Tách ra `look-at-description.md` + `look-at-snippet.md`, import `with { type: "text" }` |
| **Cấm `ReturnType<>`** | 🔴 1 chỗ (`deep-risk.md` §3.8) | |
| **Cấm `private`** | 🔴 9 chỗ (`deep-risk.md` §3.8) | đổi sang `#private` |
| **TUI sanitize** | 🔴 **CÓ — nặng nhất ở đây** — `render.ts` (118 dòng) là renderer thuần của senpi, mà `deep-risk.md` §3.7 đo `replaceTabs` = **0 file** / `PREVIEW_LIMITS` = **0 file** trên toàn bộ 603 file của cây builtin | `render.ts` phải viết lại gần như toàn bộ: `truncateToWidth` + `shortenPath` + `replaceTabs`, **kể cả error path** (`AGENTS.md` nói rõ chỗ này hay nhúng file content) |
| **Cấm `any`** | ✅ không | |

**Kết luận:** `render.ts` + `prompts.ts` + `model-selector.ts` (~240 dòng, 26% ) gần như phải viết lại
từ đầu. Phần còn lại có thể port có chỉnh.

### Vì sao "làm nếu có seam"

Điều kiện: phải có `model_select` (1.2) **và** phải quyết định được câu hỏi KDL ở trên.
Câu hỏi KDL chưa có câu trả lời thì port sẽ tạo ra một bảng tra model id thứ hai trong omp —
đúng cái `AGENTS.md` cấm. **Làm mục 1.2 trước, rồi quyết định KDL, rồi mục này.**

---

## 1.5 `config-reload` — **không đáng lúc này**

### Đo

| | |
|---|---:|
| senpi, tổng TS (không test) | **2.317** |
| `index.ts` | 974 |
| `watch-engine.ts` | 477 |
| `watch-event-source.ts` | 232 |
| `log.ts` | 220 |
| `protocol.ts` | 147 |
| `routine-settings.ts` | 113 |
| còn lại (6 file nhỏ) | 154 |
| **tỉ lệ tự thú "làm bằng extension không được"** | **11/12 = 91%** |

`deep-risk.md` §6.1: `config-reload/index.ts:48` khai `CONFIG_FILE_NAMES = ["settings.jsonc","settings.json","models.json","keybindings.json"]` — theo dõi 4 file cấu hình lõi.

### omp có gì

```bash
$ git -C $OMP grep -c 'Bun.watch\|fs.watch\|watch(' packages/coding-agent/src/config.ts
0
$ git -C $OMP grep -w -l 'reloadSettings\|watchSettings\|onSettingsChange' -- packages/coding-agent/src
0 file
$ git -C $OMP ls-files | grep -iE 'watcher|file-watch|fs-watch' | grep -v test
(rỗng)
```

omp **không có** watcher cấu hình. Đây là thiếu thật.

### Nhưng vì sao "không đáng lúc này"

Ba lý do, đều đo được:

1. **91% cắm core** — cao nhất bảng (sau `herdr` và `cache-keepalive`). Tác giả senpi tự nói 11/12 lần
   rằng làm bằng extension không được. Port 2.317 dòng mà mang theo phần lõi nó đào = viết đè kiến trúc omp.
2. **omp đã có đường thủ công** — `/reload` tồn tại (`builtin-session.ts:660`, "Force reload MCP runtime tools").
   Thiếu là tự động, không phải là không có.
3. **Chi phí vận hành cao.** Watcher phải xử lý: file chưa flush, nhiều event cho một lần ghi, ghi bởi tiến trình khác,
   symlink trong dotfile. Đây là loại code sinh bug âm thầm.

**Cái mất nếu bỏ:** người dùng sửa `settings.json` phải tự gõ `/reload`. Chấp nhận được.
**Khi nào nên làm lại:** nếu omp bắt đầu có thêm tiến trình con (worker, host daemon) dùng chung config —
lúc đó reload sai sẽ thành bug khó chẩn đoán.

---

## 2. Những cái ĐÃ bị loại — và vì sao loại

Bốn mục này được `deep-risk.md` §8.2 xếp vào "làm ngay". **Đo lại thì omp đã có hết.**

| builtin | senpi (dòng TS) | omp (dòng) | lệnh xác nhận |
|---|---:|---:|---|
| **`btw`** | 389 | **1.694** | mục 0.2 |
| **`loop-guard`** | 718 | **230** | `git ls-files \| grep -i loop-guard` → `ai/src/utils/tool-call-loop-guard.ts` (117) + `coding-agent/src/advisor/loop-guard.ts` (113) |
| **`history-search`** | 401 | **269** | `packages/tui/src/overlays/history-search.ts` |
| **`bash-timeout`** | 118 | có | `packages/coding-agent/src/tools/tool-timeouts.ts`; `bash.ts:1195-1289` xử lý `kind: "timeout"` |

Đối với `loop-guard`, phần omp thiếu là `similarity.ts` (48) + `escalation.ts` (104) — kiểu phát hiện
vòng lặp bằng **gần giống** thay vì **trùng khít**. Nhưng 152 dòng đó là cải tiến chất lượng, không
phải tính năng thiếu, và `deep-risk.md` §6.1 tự xếp nó "0 entry cắm core" — tức là có thể port
độc lập bất cứ lúc nào, không cần đi trước mục nào. **Không phải hạng mục "thiếu hẳn".**

### Và những cái bị loại vì omp mạnh hơn (không đo lại, dựa vào `builtins.md` §4.2)

`mcp` · `compaction` (omp có `snapcompact` riêng) · `ttsr` (omp có crate `pi-voice`) ·
`terminal` (omp có `bash-pty-selection.ts` + crate `pi-shell`) · `webfetch` (`fetch.ts` 53 KB) ·
`todotools` · `ask-user` · `imagegen` · `rules` · `nested-agents-md` · `bash-timeout`.

Ba nhóm "không đáng" của `deep-risk.md` §6.2 giữ nguyên phán quyết, vì lý do của chúng không phụ thuộc
vào phép đo sai: `anthropic-subscription` (76% cắm core + SDK không có trong `bun.lock` của omp),
`cursor-cli-oauth` (92% + 35 `private`), `herdr` (100% + phụ thuộc hạ tầng pane ngoài).

---

## 3. Những gì bài này KHÔNG đo được — nói thẳng để người sau không tưởng là đã đo

### 3.1 Đã trả lời trong lúc viết (nên đọc, vì nó đổi con số)

| câu hỏi | trả lời | ảnh hưởng |
|---|---|---|
| omp có sinh tool call mồ côi không? | **Có** — `cursor.ts:3673,4446,2613` mô tả "dangling call" và cơ chế `buildSessionContext` **xoá** nó | 1.3: công có thể tụt từ ~435 → **~120** nếu tái dùng quy tắc có sẵn |
| `model-resolver.ts` có parse hậu tố `:thinking` không? | **Có** — `model-resolver.ts:17,208,213,217`, `splitThinkingSuffix` là tính năng có sẵn | 1.4: `model-selector.ts` 99 → **~30** dòng |

### 3.2 Vẫn chưa đo

| câu hỏi | vì sao chưa có câu trả lời | cần gì để trả lời |
|---|---|---|
| omp có sẵn phần đọc ảnh để tái dùng cho `look-at` không? | ảnh hưởng 1/3 giá của 1.4 | kiểm `src/tools/` xử lý image |
| catalog KDL đã có trục nào giống `vision-preference` chưa? | quyết định công của 1.4 | đọc `compat/rules/classes/*.kdl` |
| `websearch` của omp có provider nào (Brave/Tavily/Kagi/SERPdive)? | `builtins.md` §4.3 nói chưa đo | liệt kê provider |

**Còn cái này tôi đã đo và nó là phát hiện, không phải khoảng trống:**
`packages/ai/src/CHANGELOG.md` và `packages/coding-agent/CHANGELOG.md` của omp có nhắc `/btw` —
nghĩa là tính năng này đã đi vào bản phát hành của omp, không phải ý tưởng trên giấy.

---

## 4. Câu hỏi mở — cần người quyết định, không tôi tự quyết

1. **Entry hay Message?** omp có `appendEntry` nhưng không có `registerEntryRenderer`.
   Ba cách: (a) cho entry đi qua `registerMessageRenderer` luôn — rẻ nhất, nhưng lẫn hai loại hiển thị;
   (b) thêm `registerEntryRenderer` — đúng mô hình senpi, +~30 dòng;
   (c) bỏ khái niệm entry, chỉ message. **Cần người quyết định vì nó đặt tiền lệ cho mọi extension sau này.**
2. **`model_select` có nên cho phép thay system prompt không?** senpi cho (`systemPrompt?: string | null`).
   Đó là quyền rất lớn — extension có thể thay toàn bộ prompt của omp. Cân nhắc giới hạn.
3. **Chi phí cache-keepalive mặc định là bao nhiêu?** senpi có `maxCostUsdPerSession` nhưng để 0 (tắt).
   Không có mặc định nào thì ta đang thiết kế sản phẩm, không phải port.

---

## 5. Tóm lại

Sau khi đo lại bằng đúng công cụ, **40 builtin của senpi không tạo ra 6 hạng mục port** như
`deep-risk.md` §8.2 kết luận. Nó tạo ra **4**, và tổng công của cả 4 là **~1.710 dòng** —
trong đó phần lớn là viết lại chứ không phải chép.

| hạng mục | công | mức | phụ thuộc |
|---|---:|---|---|
| 1.2 Seam API (`model_select` + 2 API) | ~25 | **làm ngay** | không |
| 1.1 Warm prompt cache | ~435 | **làm ngay** | 1.2 (mềm) |
| 1.3 `tool-pair-guard` | ~120–435 | **làm nếu có seam** | đọc `cursor.ts` quy tắc dangling trước |
| 1.4 `look-at` | ~740 | **làm nếu có seam** | 1.2 + quyết định KDL |
| 1.5 `config-reload` | 2.317 | **không đáng lúc này** | 91% cắm core |

**Sau khi đo lại 1.3 và 1.4 trong lúc viết, công thực tế của 4 hạng mục làm được rơi từ ~1.945
xuống ~1.325 dòng.** Ở cả hai mục đó, phần tưởng phải viết mới hoá ra omp đã có sẵn
(`cursor.ts` đã xử lý dangling call; `model-resolver.ts` đã có `splitThinkingSuffix`).

**Điều đáng nói nhất của cả bài:** mỗi lần "kiểm lại", phép đo lại giảm công ước lượng chứ không tăng.
Ba bài trước ước lượng `btw` là "ứng viên port số 1" (~389 dòng) trong khi omp đã có 1.694 dòng;
ước lượng `cache-keepalive` là "cần thêm hạ tầng vào `packages/ai`" trong khi `packages/ai` đã có
đủ `cache_control` + `CacheRetention` + axis `prompt-cache-mode`. **Công số "còn thiếu" chỉ
**giảm** khi đo đúng.** Nếu một tài liệu port nào đòi hỏi tăng chi phí sau khi kiểm tra lại,
đó là dấu hiệu nó đang đo sai.

**Bài học về phép đo — ghi lại vì sẽ lặp lại:** ba bài trước đã kết luận sai ba lần theo **cùng một
nguyên nhân**: dùng công cụ sai trả về **0**, rồi đọc 0 là "không tồn tại".
- `git grep -E '\bword\b'` → 0 (trong khi `git grep -w 'word'` → 52)
- `git ls-files '<pathspec>'` chạy từ thư mục con → rỗng (đã được `builtins.md` §0 cảnh báo, vẫn lặp lại ở §5)
- Kết quả 0 phải luôn được **xác nhận bằng lệnh thứ hai** trước khi viết thành kết luận.

---

*Đo ngày 2026-09-28. Không sửa file nào trong repo. Mọi khẳng định ở trên chạy lại được; nếu sáu tháng
sau chạy lại mà ra số khác, đó là câu hỏi đáng hỏi hơn cả bảng này.*
