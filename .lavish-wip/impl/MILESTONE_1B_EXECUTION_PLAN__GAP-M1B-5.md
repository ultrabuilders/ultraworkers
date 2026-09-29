# Phiếu triển khai — GAP-M1B-5: Nạp transport của provider theo nhu cầu

**Kế hoạch:** `/Users/tranquangdang21/Projects/ultraworkers/MILESTONE_1B_EXECUTION_PLAN.md`
**Work item:** `## GAP-M1B-5 — Nạp transport của provider theo nhu cầu thay vì nạp cả module graph tĩnh lúc import` (dòng 3098 — mục này đã dịch từ 3091 sang 3098 trong lúc tôi làm, do một agent khác sửa file kế hoạc song song; **dòng trong file kế hoạch không ổn định**, hãy tìm bằng `grep -n '^## GAP-M1B-5'`)
**Ngày kiểm:** 2026-09-29 · cây: `/Users/tranquangdang21/Projects/ultraworkers` @ `milestone-1` (`65cc6c1`)

---

## 0. KẾT LUẬN ĐẦU TIÊN — ĐỌC TRƯỚC MỌI THỨ KHÁC

Bốn neo dòng trong work item **đều đúng, từng chữ**. Nhưng khi tôi dựng module graph thật và cắt
thử bốn import đó, **thay đổi không làm giảm module graph — 0 module rời đi, 0 byte rời đi.**

```
BEFORE: 168 modules   AFTER (cắt cả 4 value-import): 169 modules   DELTA: +1
  gitlab-duo.ts           before:IN   after:IN   ← VẪN Còn NẠP
  gitlab-duo-workflow.ts  before:IN   after:IN   ← VẪN Còn NẠP
  google-auth.ts          before:IN   after:IN   ← VẪN Còn NẠP
  kimi.ts                 before:IN   after:IN   ← VẪN Còn NẠP
```

**Việc này không thể làm như tài liệu mô tả.** Không phải vì khó, mà vì `stream.ts` không phải lá
duy nhất của bốn module đó — có **hai đường khác** kéo chúng lại, và một trong hai đường là
**vòng tuần hoàn `stream.ts ↔ provider`**. Xem §1.3 và §6.

Hai hệ quả trực tiếp:

1. **Cổng hoàn thành của tài liệu không thể đỏ.** Nó đòi "con số tốt hơn baseline", mà con số đó
   **bất biến** trước và sau. §5 viết lại cổng.
2. **Mục này là làm mới — nhưng mục này đã có sẵn một bản mẫu rất giống ở `pi`.** `pi-ref` có
   trọn một hệ `*.lazy.ts` với đúng cái cơ chế giải quyết chỗ kẹt của omp. Tài liệu ghi
   *"không có tệp nào ở `pi` để chép cho riêng mảng này"* — **điều đó sai**. §1.4.

---

## 1. VIỆC 1 — KIỂM LẠI TỪNG NEO

Neo trong work item: `packages/ai/src/stream.ts:29`, `:30`, `:32`, `:35`. Tất cả **đúng**.

### 1.1 Bốn neo dòng — ĐÚNG, nguyên văn

| Neo | `sed -n "<n>p"` | Khớp tài liệu? |
| --- | --- | --- |
| `:29` | `import { streamGitLabDuo } from "./providers/gitlab-duo";` | ✅ đúng |
| `:30` | `import { type GitLabDuoWorkflowOptions, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow";` | ✅ đúng (tài liệu viết `import { …, streamGitLabDuoWorkflow }` — dấu `…` che đúng phần `type GitLabDuoWorkflowOptions` còn lại) |
| `:32` | `import { getVertexAccessToken } from "./providers/google-auth";` | ✅ đúng |
| `:35` | `import { streamKimi } from "./providers/kimi";` | ✅ đúng |

Bốn dòng nằm trong khối `:25–:39`, xen kẽ với 8 `import type` (`:25,26,27,28,31,33,34,36`). Chỉ
4 dòng kia là **value-import**; 8 dòng còn lại là type-only nên `verbatimModuleSyntax`
(`tsconfig.base.json:13`) loại khi build — chúng không kéo module nào vào runtime.

### 1.2 Các neo mềm trong work item — ĐÚNG

- **`register-builtins` "value-import hơn 12 provider"** → `packages/ai/src/providers/register-builtins.ts:17–:29`
  là **13** namespace value-import, mỗi dòng một provider:
  ```
  17: import * as AnthropicProvider from "./anthropic";
  18: import * as AzureOpenAIResponsesProvider from "./azure-openai-responses";
  19: import * as BedrockProvider from "./amazon-bedrock";
  20: import * as CursorProvider from "./cursor";
  21: import * as AppleFoundationModelsProvider from "./apple-foundation-models";
  22: import * as DevinProvider from "./devin";
  23: import * as GoogleProvider from "./google";
  24: import * as GoogleGeminiCliProvider from "./google-gemini-cli";
  25: import * as GoogleVertexProvider from "./google-vertex";
  26: import * as OllamaProvider from "./ollama";
  27: import * as OpenAICodexResponsesProvider from "./openai-codex-responses";
  28: import * as OpenAICompletionsProvider from "./openai-completions";
  29: import * as OpenAIResponsesProvider from "./openai-responses";
  ```
  ✅ "hơn 12" — chính xác là 13.

- **`api-registry.ts` + `getCustomApi` là kỹ thuật lazy có sẵn** → **SAI, một nửa.**
  `getCustomApi` tồn tại và được dùng: `packages/ai/src/stream.ts:19` (import), `:943`, `:1436`
  (gọi); định nghĩa ở `packages/ai/src/api-registry.ts:90`. **Nhưng nó không lazy gì cả** —
  thân hàm là `return customApiRegistry.get(api);` (`api-registry.ts:91`), một `Map.get` thuần.
  Lazy-loading thật của omp nằm ở chỗ khác: `packages/ai/src/registry/hooks/{api-key,custom,oauth-code,device-code}.ts`.

- **`AGENTS.md` mục cấm inline import** → `AGENTS.md:46`, nằm trong `## Code Quality` (`:42`):
  ```
  46: - **NEVER use inline imports** — no `await import()`, no `import("pkg").Type` in type positions, no dynamic type imports. Always top-level.
  ```
  ✅ đúng. Lưu ý: câu này cấm **tất cả** dynamic import, kể cả value. Ngoại lệ phải ghi ở đây.

- **Cổng `bun run check:ts`** → `package.json:90`, chạy được. ✅
- **`dev:timing` của GAP-M1B-1** → `package.json:75`. ✅

### 1.3 ĐƯỜNG KÉO LẠI — đây là lý do việc không chạy được

Tôi dựng closure value-import tĩnh từ `stream.ts` (168 module), rồi **cắt thử cả 4 dòng** trong
chính cây (file tạm đặt cùng thư mục để relative import vẫn resolve) và dựng lại. Kết quả:

```
providers/gitlab-duo.ts  (đường ngắn nhất còn lại, 5 cạnh):
  0. stream.ts
  1. providers/synthetic.ts          ← stream.ts:39  import { streamSynthetic }
  2. providers/openai-anthropic-shim.ts  ← synthetic.ts:17
  3. stream.ts                       ← openai-anthropic-shim.ts:12  import { ANTHROPIC_THINKING, mapAnthropicToolChoice } from "../stream"
  4. providers/gitlab-duo.ts

providers/kimi.ts (cùng hình):
  stream.ts → synthetic.ts → openai-anthropic-shim.ts → stream.ts → providers/kimi.ts

providers/gitlab-duo-workflow.ts (cùng hình):
  stream.ts → synthetic.ts → openai-anthropic-shim.ts → stream.ts → providers/gitlab-duo-workflow.ts

providers/google-auth.ts (4 cạnh, không qua vòng):
  stream.ts → providers/register-builtins.ts  ← stream.ts:54
           → providers/google-vertex.ts      ← register-builtins.ts:25
           → providers/google-auth.ts         ← google-vertex.ts:6
```

Hai cơ chế, hai cách sửa khác nhau:

**(a) Vòng tuần hoàn `stream.ts ↔ provider`.** 9 provider value-import ngược lại `../stream`:
`openai-anthropic-shim.ts:12`, `gitlab-duo.ts:5`, `google.ts:2`, `azure-openai-responses.ts:3`,
`ollama.ts:4`, `openai-codex-responses.ts:26`, `openai-responses.ts:4`, `anthropic.ts:20`,
`openai-completions.ts:11`. Chỉ cần một cặp (`stream.ts` → `synthetic.ts` → `openai-anthropic-shim.ts`
→ `stream.ts`) là cả ba module gitlab/kimi quay lại. Cắt import ở `stream.ts` **không cắt được vòng** —
phải cắt ở `synthetic.ts:17` hoặc ở `openai-anthropic-shim.ts:12`.

**(b) Đường vòng qua `register-builtins`.** `stream.ts:54` value-import `register-builtins`, và
`register-builtins.ts:25` value-import `google-vertex`, và `google-vertex.ts:6` value-import
`getVertexAccessToken`. Nên `google-auth` nằm trong graph **dù `stream.ts:32` có bị xoá hay không**.
Cách duy nhất cắt được: `google-vertex.ts` cũng phải lazy, hoặc `register-builtins` phải lazy.

### 1.4 `pi` CÓ sẵn bản mẫu — tài liệu nói không có là sai

`pi-ref` không có `stream.ts` (đúng), nhưng nó **có trọn hệ lazy transport**, 13 file
`packages/ai/src/api/*.lazy.ts` cộng một `lazy.ts`:

```
$ rg -n '\(\) => import\(|await import\(' /Users/tranquangdang21/Projects/pi-ref/packages/ai/src
api/google-vertex.lazy.ts:4:        export const googleVertexApi = (): ProviderStreams => lazyApi(() => import("./google-vertex.ts"));
api/openai-responses.lazy.ts:4:      export const openAIResponsesApi = (): ProviderStreams => lazyApi(() => import("./openai-responses.ts"));
api/anthropic-messages.lazy.ts:4:    export const anthropicMessagesApi = (): ProviderStreams => lazyApi(() => import("./anthropic-messages.ts"));
… (13 file)
```

Và cơ chế cốt lõi — `/Users/tranquangdang21/Projects/pi-ref/packages/ai/src/api/lazy.ts:46-61`:

```ts
export function lazyStream(
	model: Model<Api>,
	setup: () => Promise<AsyncIterable<AssistantMessageEvent>>,
): AssistantMessageEventStream {
	const outer = new AssistantMessageEventStream();
	setup()
		.then((inner) => forwardStream(outer, inner))
		.catch((error) => {
			const message = createSetupErrorMessage(model, error);
			outer.push({ type: "error", reason: "error", error: message });
			outer.end(message);
		});
	return outer;
}
```

Đây **đúng** là thứ giải quyết chỗ kẹt lớn nhất của omp (mục A ở §6.1), và tài liệu đã viết
*"không có tệp nào ở `pi` để chép cho riêng mảng này — đây là chỗ omp nên làm khác"*. Câu đó
không đúng: có tệp, và nó giải quyết đúng chỗ khó nhất. Điều đổi là **tên miền** (`ProviderStreams`
của `pi` vs `streamDispatch`/`streamSimpleRequest` của omp), không phải sự tồn tại của mẫu.

**Hệ quả pháp lý:** `pi-ref/LICENSE` là MIT, `Copyright (c) 2025 Mario Zechner`. Copy `lazyStream`
nguyên văn ⇒ **có nghĩa vụ attribution** và phải nối dòng bản quền omp (theo M1B §1, giữ Zechner là
dòng đầu). Tài liệu ghi *"không có nghĩa vụ attribution"* — chỉ đúng nếu **không** chép gì. Đây là
một trong hai điểm cần người quyết (§7).

---

## 2. VIỆC 2 — PHIẾU TRIỂN KHAI

### 2.1 Cái gì thay đổi, quan sát được

> `bun run dev:timing` báo cáo entry-graph của `omp` **không còn chứa**
> `providers/gitlab-duo`, `providers/gitlab-duo-workflow`, `providers/google-auth` và
> `providers/kimi` khi người dùng dùng bất kỳ provider nào khác — trong khi gọi stream tới một
> trong bốn provider đó vẫn trả về đúng kết cục, và khi module không nạp được thì lỗi nêu **đúng
> tên provider** thay vì `Cannot find module`.

Nói bằng kết quả: sau thay đổi, bốn module 154.630 byte ấy **không còn nằm trong graph tĩnh của
`stream.ts`**; số module nạp lúc mở omp giảm; và provider không biến mất.

### 2.2 Bảng điểm sửa

| path | symbol | TRƯỚC (nguyên văn từ file thật) | SAU (hình dạng) |
| --- | --- | --- | --- |
| `packages/ai/src/stream.ts:29` | `streamGitLabDuo` | `import { streamGitLabDuo } from "./providers/gitlab-duo";` | xoá dòng; call site `:953` và `:1472` gọi qua `lazyStream(model, async () => (await loadGitLabDuo()).streamGitLabDuo(...))` |
| `packages/ai/src/stream.ts:30` | `streamGitLabDuoWorkflow` + `type GitLabDuoWorkflowOptions` | `import { type GitLabDuoWorkflowOptions, streamGitLabDuoWorkflow } from "./providers/gitlab-duo-workflow";` | **TÁCH HAI DÒNG**: giữ `import type { GitLabDuoWorkflowOptions } from "./providers/gitlab-duo-workflow";` (type-only, `:967` còn dùng), bỏ phần value; call site `:964` và `:1486` đi qua `lazyStream` |
| `packages/ai/src/stream.ts:32` | `getVertexAccessToken` | `import { getVertexAccessToken } from "./providers/google-auth";` | xoá dòng; call site `:736` (`await` sẵn) → `const { getVertexAccessToken } = await loadGoogleAuth();` |
| `packages/ai/src/stream.ts:35` | `streamKimi` | `import { streamKimi } from "./providers/kimi";` | xoá dòng; call site `:1504` đi qua `lazyStream` |
| `packages/ai/src/providers/google-vertex.ts:6` | `getVertexAccessToken` | `import { getVertexAccessToken } from "./google-auth";` | **BẮT BUỘC** — không sửa dòng này thì `google-auth` vẫn nạp qua `register-builtins:25`. Đổi thành lazy trong `streamGoogleVertex` (`:90`) |
| `packages/ai/src/providers/openai-anthropic-shim.ts:12` | `ANTHROPIC_THINKING, mapAnthropicToolChoice` | `import { ANTHROPIC_THINKING, mapAnthropicToolChoice } from "../stream";` | **BẮT BUỘC** — cắt chỗ vòng tuần hoàn. Chọn một trong hai: (i) dời 2 symbol này sang một module trung lập không import ngược, hoặc (ii) `stream.ts` gọi `streamSynthetic` cũng qua `lazyStream` để không kéo shim vào graph tĩnh |
| `packages/ai/src/providers/synthetic.ts:17` | `streamOpenAIAnthropicShim` | `} from "./openai-anthropic-shim";` | chỉ sửa nếu chọn phương án (ii) ở dòng trên |
| `packages/ai/src/registry/transports.ts` **(tệp MỚI)** | `PROVIDER_TRANSPORTS` | — | registry value duy nhất chứa `() => import(...)`; **mọc quanh 4 provider**; export `loadGitLabDuo()`, `loadGitLabDuoWorkflow()`, `loadGoogleAuth()`, `loadKimi()` + `lazyStream()` (port từ `pi/api/lazy.ts:46`) |
| `AGENTS.md:46` | luật cấm inline import | `- **NEVER use inline imports** — no \`await import()\`, no \`import("pkg").Type\` in type positions, no dynamic type imports. Always top-level.` | thêm một câu ngoại lệ **giới hạn theo tên file**: `packages/ai/src/registry/transports.ts` là nơi duy nhất được phép `() => import(...)`, và chỉ để nạp provider transport theo nhu cầu |

### 2.3 Các bước, mỗi bước có neo đã kiểm

**Bước 0 — Chốt quyết định attribution (chặn bước 1).** Xem §7 câu 1. Chép `lazyStream` từ `pi` ⇒ có
nghĩa vụ MIT; tự viết lại ⇒ không có. Phải chốt trước khi viết dòng nào.

**Bước 1 — Chờ GAP-M1B-1 có baseline.** Xác nhận hiện trạng: `ls scripts/check-entry-graphs.mjs`
→ *No such file or directory*; `grep -rniE 'entry.?graph|bundle.?budget|startup.?budget|graph.?cost' package.json scripts/ .github/`
→ **0 hit**. Cổng **chưa tồn tại**. Baseline phải chụp sau sóng port, không phải ở HEAD hôm nay.

**Bước 2 — Tạo `packages/ai/src/registry/transports.ts`.** Chứa `PROVIDER_TRANSPORTS` và `lazyStream`.
`lazyStream` là phần khó: `streamGitLabDuo` (`gitlab-duo.ts:90`), `streamGitLabDuoWorkflow`
(`gitlab-duo-workflow.ts:423`) và `streamKimi` (`kimi.ts:32`) đều trả
`AssistantMessageEventStream` **đồng bộ** — không `async`. `await import()` bên trong một hàm
đồng bộ là bất khả thi. `lazyStream` giải đúng chỗ này: trả stream tức thì, chạy setup sau, lỗi
thành error event. Lấy nguyên văn `pi-ref/packages/ai/src/api/lazy.ts:46-61` (xem §1.4 về pháp lý),
`createSetupErrorMessage` ở `:4-23`, `forwardStream` ở `:31-39`.

**Bước 3 — Sửa `stream.ts:29,30,32,35`.** Nhớ `:30` phải **tách** type và value (`:967` còn dùng
`GitLabDuoWorkflowOptions`). Call site cần sửa: `:736` (getVertex), `:953`, `:964` (gitlab duo),
`:1472`, `:1486` (workflow), `:1504` (kimi).

**Bước 4 — Cắt hai đường vòng. Đây là bước quyết định mục này còn ích hay không.**
- `google-vertex.ts:6` + `:90` — nếu bỏ qua, `google-auth` vẫn nạp qua `register-builtins:25`.
- `openai-anthropic-shim.ts:12` hoặc `synthetic.ts:17` — nếu bỏ qua, cả ba module gitlab/kimi quay
  lại qua vòng `stream.ts → synthetic.ts → shim → stream.ts`.

**Bước 5 — Bọc lỗi, nêu đúng tên provider.** Đây là điều kiện âm bắt buộc. `createSetupErrorMessage`
của `pi` (`lazy.ts:4-23`) đã điền `api`/`provider`/`model` từ `model` vào message, nhưng
`errorMessage` vẫn là `error.message` thô — tức là **"Cannot find module" vẫn lọt lên**. Phải ghi đè
phần này: khi `load` ném lỗi, message phải chứa tên provider cụ thể (`gitlab-duo`,
`gitlab-duo-agent`, `google-vertex`, `kimi-code`). Đừng dựa vào `createSetupErrorMessage` nguyên xi.

**Bước 6 — Ghi ngoại lệ vào `AGENTS.md:46` cùng lúc với code.** Giới hạn bằng **tên file**, không ghi
chung chung "lazy import được phép ở provider" — câu đó không kiểm chứng được ở lần review sau.

**Bước 7 — Đo lại, đối chiếu baseline.** Dùng cổng của GAP-M1B-1. Điều kiện đỏ ở §5.

### 2.4 Hợp đồng test

Tệp mới: `packages/ai/test/provider-transport-lazy.test.ts` (viết mới — không có tệp nào để chép
cho mảng này). Dùng `bun:test`, `describe/expect/it/vi`.

**Case 1 — hợp đồng tích cực, đủ 4 provider.** Với mỗi provider trong `{gitlab-duo, gitlab-duo-agent,
google-vertex, kimi-code}`, gọi `stream(model, context, options)` rồi drain, khẳng định stream kết
thúc bằng event `done` (không phải `error`). *Hồi quy:* provider biến mất — `stream` trả về stream
ngay nhưng kết thúc bằng `error`, và người dùng thấy provider của họ ngừng hoạt động sau một
refactor không liên quan.

**Case 2 — hợp đồng âm bắt buộc, lỗi phải nêu tên provider.** Chặn loader của một provider (ví dụ
`vi.spyOn` trên registry, hoặc truyền một specifier hỏng có chủ đích), rồi khẳng định
`errorMessage` **chứa tên provider** và **không chứa** `Cannot find module`. Đây là case tách
tối ưu khỏi lỗi. *Hồi quy:* người dùng thấy `Cannot find module '.../providers/kimi'` và không
cách nào đoán ra đó là provider nào.

**Case 3 — lazy thật sự lazy, quan sát được.** Khởi tạo một lần, đo side effect: sau khi gọi
`stream()` cho provider A rồi lại provider B, module của B **chưa** được nạp cho tới khi stream
của B thực sự chạy. Không `mock.module()` (AGENTS.md cấm tuyệt đối). Cách làm đúng: dùng seam của
`Bun.plugin` onLoad có phạm vi hẹp, hoặc đếm bằng cờ set trong chính registry, hoặc — đơn giản và
chắc nhất — **đo bằng module graph tĩnh** ở case 4.

**Case 4 — graph tĩnh không còn chứa 4 module.** Đây là case chống hồi quy cho **cả cơ chế**, và nó
bắt được đúng hai đường vòng ở §1.3 — thứ mà ba case kia bỏ lọt. Dùng `Bun.build({ entrypoints:
["…/packages/ai/src/stream.ts"], target: "bun" })` rồi đọc `outputs[0].imports`, khẳng định
`imports` **không** chứa `gitlab-duo`, `gitlab-duo-workflow`, `google-auth`, `kimi`. Đây là đọc
**graph đã build**, không phải quét văn bản nguồn — nên **không** vi phạm lệ "Never source-grep".
*Hồi quy:* ai đó thêm lại một value-import ở bất kỳ đâu trong vòng, module quay lại graph, test đỏ.

**Vệ sinh test (AGENTS.md):** không `mock.module()`; `vi.restoreAllMocks()` trong `afterEach`;
không đột biến `Bun.*`/`process.env` ở cả file; không assert kiểu "chuỗi không rỗng" / "dài hơn
trước".

### 2.5 Cổng

| # | Lệnh | Đỏ được không? |
| --- | --- | --- |
| 1 | `bun run check:ts` | **Có** — nhưng chỉ bắt lỗi kiểu, không bắt hồi quy hiệu năng |
| 2 | `bun run dev:timing` | **Có** — đo được, nhưng **không tự đỏ**; cần baseline |
| 3 | Cổng entry-graph của GAP-M1B-1 | **Hiện chưa tồn tại** |

**Trả lời thẳng câu quan trọng nhất: cổng trong tài liệu KHÔNG đỏ được.**

Tài liệu đòi: *"`bun run check:ts` exit 0 **và** cổng entry-graph chạy với con số tốt hơn baseline"*.
Đó **không phải một cổng** — đó là một phép đo kèm hy vọng. Nó không đỏ được theo bất kỳ nghĩa nào:
ai cũng có thể merge một PR **không cải thiện gì** mà mọi dòng đều xanh. Đây đúng là *"một cổng luôn
xanh tệ hơn không có cổng, vì nó tạo cảm giác an toàn giả"* — và với mục này nó còn tệ hơn thông
thường, vì §1.3 cho thấy con số đó **bất biến** trước và sau khi sửa đúng theo tài liệu.

**Viết lại cho đỏ được — cổng thật:**

> **Cổng của GAP-M1B-5 là `test/provider-transport-lazy.test.ts` case 4.**
> Khẳng định: module graph tĩnh build từ `packages/ai/src/stream.ts` **không chứa**
> `providers/gitlab-duo`, `providers/gitlab-duo-workflow`, `providers/google-auth`,
> `providers/kimi`. Cổng này đỏ được ngay lần chạy đầu tiên trên cây hiện tại — tôi đã đo:
> cả bốn đều `IN GRAPH` ở HEAD `65cc6c1`. Thêm lại **một** value-import ở bất kỳ đâu trong vòng
> cũng làm nó đỏ.

Đây là một điểm tốt của mục này mà tài liệu không nói: **vì 4 module hiện vẫn nằm trong graph
dù đã có lazy registry ở tầng OAuth, cổng đỏ sẵn ngay** — không phải phải nới ngưỡng, không
phải chờ baseline. Và nó bắt được đúng hai đường vòng của §1.3, tức là nó bắt được thứ mà
"con số tốt hơn baseline" không bắt được.

Giữ cổng 1 và 2 như **hàng phụ** (không phải hàng định nghĩa): `check:ts` bắt lỗi kiểu; `dev:timing`
cung cấp **con số** để đưa vào mô tả PR, nhưng không ai assert số đó. Và ghi rõ trong PR:
*con số giảm được bao nhiêu* — đó là thông tin cho người đọc, không phải tiêu chí nghiệm thu.

### 2.6 Cạm bẫy riêng của work item này

Xếp theo mức độ dễ làm sai:

1. **Sửa xong 4 dòng, tưởng xong, thực tế 0 module rời đi.** Đây là cạm bẫp số một và nó **đã được
   chứng minh bằng đo** (§0, §1.3). `stream.ts` không phải lá duy nhất. Hai đường vòng:
   `register-builtins.ts:25 → google-vertex.ts:6 → google-auth`, và vòng tuần hoàn
   `stream.ts:39 → synthetic.ts:17 → openai-anthropic-shim.ts:12 → stream.ts`. Cắm đúng 4 dòng thì
   gitlab/kimi quay lại qua vòng, google-auth quay lại qua register-builtins. **Đừng tin grep
   "chỉ có stream.ts import"** — grep không thấy đường vòi bắc qua 2-3 file.

2. **`await import()` không dùng được trong hàm đồng bộ — và cả ba provider đều đồng bộ.**
   `streamGitLabDuo` (`gitlab-duo.ts:90`), `streamGitLabDuoWorkflow` (`gitlab-duo-workflow.ts:423`),
   `streamKimi` (`kimi.ts:32`) đều khai `): AssistantMessageEventStream {` — trả về **ngay**, không
   phải `Promise`. `streamDispatch` (`stream.ts:934`) và `streamSimpleRequest` (`stream.ts:1254`)
   cũng vậy. Sửa nhanh nhất — biến chúng thành `async` — **phá hợp đồng của `stream()`**
   (`stream.ts:910`, hợp đồng đồng bộ mà agent và `cache-warmer.ts:480` dùng). Đây chính là lý do
   `lazyStream` tồn tại trong `pi`, và lý do không thể tự nghĩ ra khi đang gõ.

3. **Bỏ qua dòng `:30` thì vỡ kiểu.** Dòng đó gộp **type và value**:
   `import { type GitLabDuoWorkflowOptions, streamGitLabDuoWorkflow } from …`. Xoá cả dòng thì
   `:967` (`} as GitLabDuoWorkflowOptions);`) hỏng. Phải tách: giữ `import type`, bỏ phần value.

4. **`createSetupErrorMessage` của `pi` KHÔNG đáp ứng điều kiện âm của tài liệu.** Nó điền
   `api`/`provider`/`model` vào *object*, nhưng `errorMessage` vẫn là `error.message` thô
   (`lazy.ts:20`) — tức `Cannot find module` **vẫn lọt lên**, đúng thứ tài liệu gọi là "thứ tách
   một tối ưu khỏi một lỗi". Phải ghi đè, không chép nguyên xi.

5. **Quy tắc "một file" của tài liệu đã sai sẵn trước khi bắt đầu.** `rg -c '() => import(' packages/ai/src`
   ở HEAD trả về **22 chỗ trong 4 file** (`registry/hooks/{api-key,custom,oauth-code,device-code}.ts`).
   Sau khi làm xong mục này sẽ là ~26 chỗ trong 5 file. Lệnh xác minh
   `grep -rn '() => import(' packages/ai/src` **không bao giờ** chứng minh được "một file" — nó
   trả về ≥22 hit ngay bây giờ. Phải viết lại thành: *không file nào ngoài `registry/hooks/*` và
   `registry/transports.ts` được chứa `() => import(`*.

6. **Cổng của GAP-M1B-1 chưa tồn tại.** `ls scripts/check-entry-graphs.mjs` → *No such file*;
   `grep -rniE 'entry.?graph|…' package.json scripts/ .github/` → 0 hit. Bước 1 của mục này là
   **chờ một thứ chưa có**. Nếu ai đó chạy phiếu này hôm nay, bước 1 không thoả được.

7. **Attribution.** Tài liệu khẳng định "không có nghĩa vụ attribution" — chỉ đúng nếu **không chép
   gì từ `pi`**. Nhưng `pi` có sẵn đúng cái `lazyStream` giải quyết cạm bẫy 2. Chép nó ⇒ MIT với
   `Copyright (c) 2025 Mario Zechner` phải nằm ở dòng đầu. Quyết định này phải chốt trước khi
   viết dòng code đầu tiên (§7).

---

## 3. Bảng kiểm lại neo (tóm tắt)

| # | neo trong tài liệu | trạng thái | ghi chú |
| --- | --- | --- | --- |
| 1 | `packages/ai/src/stream.ts:29` | ✅ ĐÚNG | `import { streamGitLabDuo } from "./providers/gitlab-duo";` |
| 2 | `packages/ai/src/stream.ts:30` | ✅ ĐÚNG | dấu `…` che `type GitLabDuoWorkflowOptions` |
| 3 | `packages/ai/src/stream.ts:32` | ✅ ĐÚNG | `import { getVertexAccessToken } from "./providers/google-auth";` |
| 4 | `packages/ai/src/stream.ts:35` | ✅ ĐÚNG | `import { streamKimi } from "./providers/kimi";` |
| 5 | `register-builtins` ">12 provider" | ✅ ĐÚNG | 13 namespace import ở `:17–:29` |
| 6 | `api-registry.ts` + `getCustomApi` = kỹ thuật lazy | ❌ SAI MỘT NỬA | `api-registry.ts:91` là `Map.get` thuần, không lazy. Lazy thật ở `registry/hooks/*.ts` (22 chỗ / 4 file) |
| 7 | "không có tệp nào ở `pi` để chép" | ❌ SAI | `pi-ref/packages/ai/src/api/lazy.ts:46-61` `lazyStream` + 13 file `*.lazy.ts` |
| 8 | "không có nghĩa vụ attribution" | ⚠️ PHỤ THUỘC | đúng nếu không chép; sai nếu chép `lazyStream` (MIT, Zechner) |
| 9 | `AGENTS.md` mục cấm inline import | ✅ ĐÚNG | `AGENTS.md:46` |
| 10 | `bun run check:ts` | ✅ ĐÚNG | `package.json:90` |
| 11 | Cổng entry-graph GAP-M1B-1 | ❌ CHƯA TỒN TẠI | `scripts/check-entry-graphs.mjs` không có; grep → 0 hit |
| 12 | Quy tắc "phạm vi ngoại lệ là MỘT file" | ❌ KHÔNG THỂ ĐÚNG | 22 chỗ `() => import(` đã tồn tại trong 4 file, trước khi mục này bắt đầu |
| 13 | "4 value-import này nạp code không liên quan lúc import" | ⚠️ ĐÚNG NHƯNG VÔ DỤNG | cắt cả 4 ⇒ **0 module rời**, 4 module vẫn `IN GRAPH` |

**13 mục: 8 đúng, 4 sai, 1 phụ thuộc.** Bốn neo dòng — thứ tài liệu dựa vào — đều đúng.

---

## 4. Đo đạc đã chạy

Tất cả bằng script tạm trong `/tmp`, không sửa file nào trong repo.

```
$ bun /tmp/probe7.mjs        # closure value-import tĩnh từ stream.ts, cắt thử 4 dòng
BEFORE: 168 modules   AFTER: 169 modules   DELTA: +1
  gitlab-duo.ts           before:IN   after:IN  ← VẪN CÒN NẠP
  gitlab-duo-workflow.ts  before:IN   after:IN  ← VẪN CÒN NẠP
  google-auth.ts          before:IN   after:IN  ← VẪN CÒN NẠP
  kimi.ts                 before:IN   after:IN  ← VẪN CÒN NẠP
modules dropped: 0 (0 bytes)
stream.ts 2298 -> 2294 lines

$ bun /tmp/probe8.mjs        # đường ngắn nhất còn lại tới từng module
gitlab-duo.ts          stream.ts → synthetic.ts → openai-anthropic-shim.ts → stream.ts → gitlab-duo.ts
gitlab-duo-workflow.ts stream.ts → synthetic.ts → openai-anthropic-shim.ts → stream.ts → gitlab-duo-workflow.ts
kimi.ts                stream.ts → synthetic.ts → openai-anthropic-shim.ts → stream.ts → kimi.ts
google-auth.ts         stream.ts → register-builtins.ts → google-vertex.ts → google-auth.ts

$ bun /tmp/probe4.mjs        # quy mô graph
stream.ts static value-import closure: 168 local modules
bytes của 4 module: 154630
  234738  providers/anthropic.ts
  206273  providers/cursor.ts
  196480  providers/openai-codex-responses.ts
  163190  providers/openai-shared.ts
  131310  providers/gitlab-duo-workflow.ts
```

Ghi chú về con số 168: đó là **module cục bộ** trong closure value-import, đo bằng cách duyệt
`import`/`export … from` không bắt đầu bằng `type`. Nó không phải ms, và không phải số module
mà `PI_TIMING` sẽ báo — `PI_TIMING` đo thời gian thật. Dùng 168 để **chứng minh cấu trúc graph**;
dùng `dev:timing` để lấy **ms**.

---

## 5. Cổng hoàn thành (viết lại)

| | |
| --- | --- |
| **Đỏ được** | ✅ `packages/ai/test/provider-transport-lazy.test.ts` case 4 — module graph tĩnh build từ `stream.ts` không chứa 4 provider kia. **Đỏ ngay ở cây hiện tại** (cả 4 đều `IN GRAPH`), nên không cần nới ngưỡng, không cần chờ baseline. |
| **Kèm theo** | `bun run check:ts` exit 0 (bắt lỗi kiểu). |
| **Thông tin, không phải tiêu chí** | `bun run dev:timing` chạy được, con số entry-graph giảm, ghi vào mô tả PR. |
| **Bỏ** | Cổng entry-graph của GAP-M1B-1 như tiêu chí nghiệm thu — nó chưa tồn tại, và khi có nó cũng chỉ đo tổng ngân sách chứ không chứng minh riêng mục này. Dùng nó để **đối chiếu**, không để **quyết định**. |

---

## 6. Phụ lục — ghi chú kỹ thuật

### 6.1 Vì sao `lazyStream` là bắt buộc chứ không phải tiện lợi

`stream.ts:934` `streamDispatch` và `stream.ts:1254` `streamSimpleRequest` đều khai
`): AssistantMessageEventStream {` — **đồng bộ**. `stream()` (`:910`) là API công khai của
`@oh-my-pi/pi-ai`, và `packages/coding-agent/src/session/cache-warmer.ts:480` gọi nó như
`await this.#deps.stream(...)` — chờ một giá trị đã resolve. Biến nó thành `Promise` là breaking
change cho agent.

`lazyStream` giữ nguyên hợp đồng đồng bộ:

```ts
export function lazyStream(
	model: Model<Api>,
	setup: () => Promise<AsyncIterable<AssistantMessageEvent>>,
): AssistantMessageEventStream {
	const outer = new AssistantMessageEventStream();
	setup()
		.then((inner) => forwardStream(outer, inner))
		.catch((error) => {
			const message = createSetupErrorMessage(model, error);
			outer.push({ type: "error", reason: "error", error: message });
			outer.end(message);
		});
	return outer;
}
```

omp **đã có** đúng mẫu này rồi — `packages/ai/src/stream.ts:1342` (`void (async () => {`) và
`providers/ollama.ts:454`, `providers/apple-foundation-models.ts:266`,
`providers/pi-native-client.ts:154`. Nên đây không phải mẫu lạ; nó là cách omp đã giải chuyện
"module nạp sau" ở 4 nơi khác.

### 6.2 Vòng tuần hoàn: đủ để phá mọi thứ

`rg -n 'from "\.\./stream"' packages/ai/src/providers/*.ts` → 9 file:

```
openai-anthropic-shim.ts:12:  import { ANTHROPIC_THINKING, mapAnthropicToolChoice } from "../stream";
gitlab-duo.ts:5:             import { ANTHROPIC_THINKING, mapAnthropicToolChoice } from "../stream";
google.ts:2:                  import { getEnvApiKey } from "../stream";
azure-openai-responses.ts:3:  import { getEnvApiKey } from "../stream";
ollama.ts:4:                  import { getEnvApiKey } from "../stream";
openai-codex-responses.ts:26: import { getEnvApiKey, isOfficialCodexApiUrl } from "../stream";
openai-responses.ts:4:        import { getEnvApiKey } from "../stream";
anthropic.ts:20:              import { getEnvApiKey, OUTPUT_FALLBACK_BUFFER } from "../stream";
openai-completions.ts:11:     import { getEnvApiKey } from "../stream";
```

`getEnvApiKey` (`stream.ts:870`) và `ANTHROPIC_THINKING`/`mapAnthropicToolChoice` là hằng/hàm
nhỏ. **Dời chúng ra một module trung lập** là cách sạch nhất để cắt vòng — và nó nên là một phần
của mục này, không phải việc dành cho sau. Không làm vậy thì đường vòng 3–4 cạnh vẫn kéo
gitlab/kimi về.

---

## 7. Cần người quyết

1. **Có chép `lazyStream` từ `pi` không?** `pi-ref/packages/ai/src/api/lazy.ts:46-61` giải đúng
   chỗ kẹt đồng bộ. Chép ⇒ có nghĩa vụ MIT, `Copyright (c) 2025 Mario Zechner` ở dòng đầu, và mục
   này **không còn là "làm mới"** như tài liệu ghi. Tự viết lại ⇒ không nghĩa vụ, nhưng phải tự
   chứng minh tương đương. *(Khuyến nghị: chép. Đây là 15 dòng, MIT, và viết lại chỉ để tránh
   attribution là tốn kém hơn giá trị.)*
2. **Cổng entry-graph của GAP-M1B-1 khi nào có?** Mục này phụ thuộc cứng vào nó, nhưng nó chưa
   tồn tại (`ls scripts/check-entry-graphs.mjs` → *No such file*). Chạy phiếu này hôm nay thì
   bước 1 không thoả được. Có chấp nhận chạy **không** có nó, dựa vào cổng test case 4 ở §2.5,
   không?
3. **Phạm vi ngoại lệ ghi ở `AGENTS.md:46` thế nào?** Không thể ghi "một file" (§2.6 cạm bẫy 5 —
   4 file đã có). Đề xuất: liệt kê tường minh `packages/ai/src/registry/transports.ts` **và**
   `packages/ai/src/registry/hooks/*.ts`, rồi ghi rõ mọi file khác trong `packages/ai/src` là vi
   phạm.
4. **Cắt vòng tuần hoàn có nằm trong phạm vi mục này không?** Không cắt thì mục này **không đem
   lại lợi ích gì** (§0). Tách `getEnvApiKey` + `ANTHROPIC_THINKING` + `mapAnthropicToolChoice`
   ra module trung lập là việc 9 file cùng đổi — có nằm trong PR này, hay tách PR riêng làm
   tiền đề?
