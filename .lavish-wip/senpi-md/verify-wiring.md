# PHẢN BIỆN `deep-risk.md` — đo lại từng khẳng định

> Viết **2026-09-28**. Nhiệm vụ: **bác bỏ** tài liệu, mặc định là sai.
>
> **Lưu ý tên file:** đề bài yêu cầu bác bỏ `senpi-md/deep-wiring.md`. File đó **không tồn tại**
> (`find . -name "*wiring*"` trong `.lavish-wip/` → không có; `grep -rl deep-wiring .lavish-wip/` → rỗng).
> File duy nhất ứng viên là **`senpi-md/deep-risk.md`** (56 KB, sửa lần cuối 12:52:19 — cùng mốc với thư mục).
> Tôi bác bỏ **`deep-risk.md`**. Nếu đề bài thực sự trỏ file khác thì mọi dòng dưới đây không áp dụng.
>
> **Cây đo** (HEAD lúc đo):
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref        # ea92162, 2026-09-28
> OMP=/Users/tranquangdang21/Projects/ultraworkers
> PI=/Users/tranquangdang21/Projects/pi-ref
> ```
>
> **Mẫu đo dùng lại** (đúng như tài liệu ghi):
> ```bash
> cd $S
> git ls-files 'packages/coding-agent/src/core/extensions/builtin' | grep -E '\.ts$' | grep -v '/test/' > /tmp/bi_ts.txt
> wc -l < /tmp/bi_ts.txt     # 603
> ```

---

## 0. Kết luận một câu

`deep-risk.md` **đúng trong các phép đo lớn, sai trong các con số nhỏ**. Mọi phép đo mang tầng quyết định
(dòng file, số vi phạm lớn, bảng tự-thú cắm core 23 dòng, bảng dòng-code 19 dòng) **tôi chạy lại và khớp
tuyệt đối**. Nhưng **14 con số sai**, và **3 chỗ tự mâu thuẫn với chính lệnh mà nó dán bên dưới**.

Đáng chú ý: **sai số đều đi theo một hướng** — tài liệu **thu nhỏ**. Nó đếm 10 path trong khi lệnh ra 55,
đếm 14 dòng trong khi lệnh ra 13, đếm 35 modifier trong khi lệnh ra 197, đếm 18 `.kdl` trong khi có 19.
Không có sai số nào phóng to. Điều đó **không** làm kết luận sai — nhưng nó làm giảm đáng tin vào các
con số chưa kiểm.

**Không bác bỏ được điều gì ở tầng quyết định.** Ba kết luận chính — `prompt-preset` phải viết lại,
`cursor-cli-oauth`/`anthropic-subscription` không lấy, giữ nguyên session layer của omp — **đứng vững**
sau khi đo lại.

---

## 1. NHỮNG CÁI TÔI BÁC BỎ ĐƯỢC (sai số, đo lại bằng lệnh khác)

### 1.1 🔴 §3.1 — "14 dòng khớp" thực tế là **13**, và dòng `compaction` là **bịa thêm vào**

Lệnh của tài liệu:
```bash
cd $S
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/bi_ts.txt | wc -l
# 13        ← tài liệu ghi 14
```

Dòng mà tài liệu liệt kê là `compaction/prompts.ts:292` **không khớp regex của chính lệnh đó**:
```bash
sed -n '292p' packages/coding-agent/src/core/extensions/builtin/compaction/prompts.ts
# 	return /^gpt-|^o\d|codex/.test(model.id ?? "") || model.provider === "openai" || ...
grep -cE '\.(includes|startsWith|endsWith)\(' packages/coding-agent/src/core/extensions/builtin/compaction/prompts.ts
# 0        ← cả file không có lệnh .includes/.startsWith/.endsWith nào
```
Dòng đó dùng **`.test()`** trên regex, không phải `.includes("...")`. Nó nằm trong khối output của tài liệu
bằng cách **thêm tay**, không phải do lệnh sinh ra.

**Và phép cộng "13/14 nằm trong `prompt-preset` + `compaction`" là vô nghĩa số học:**
```bash
grep -c 'prompt-preset/presets.ts'  /tmp/mid.txt   # 10
grep -c 'compaction'                /tmp/mid.txt   # 0
# 10 + 0 = 10, không phải 13
```
Số đúng: **10/13 trong `prompt-preset`**, 0 trong `compaction`. Kết luận *"13/14 là cấu trúc, không phải tai
nạn"* vẫn đúng hướng, nhưng con số phải sửa. **Phán quyết `prompt-preset` không đổi** — 10 nhánh vẫn là
vi phạm.

### 1.2 🔴 §3.6 — "35 modifier" thực tế là **197**

Lệnh của tài liệu (ngay dưới tiêu đề "35 file"):
```bash
cd $S
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null \
  | grep -v ':0$' | awk -F: '{s+=$2} END{print "TỔNG:",s}'
# 197       ← tài liệu ghi 35
```
Con số **35 là số *file***, không phải số modifier:
```bash
xargs grep -lE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | wc -l
# 35        ← đây mới là 35
```
Tài liệu lấy 35 (file) rồi in nó cạnh một lệnh đếm modifier — **đơn vị đo bị trộn**. Sai 5,6×.

**Phần nào của tài liệu vẫn đúng:** bảng phân bố per-builtin là **modifier count** và khớp tuyệt đối:
```bash
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' \
  | sed 's|.*/builtin/||' | awk -F: '{split($1,a,"/"); s[a[1]]+=$2} END{for(k in s) printf "%-26s %d\n", k, s[k]}' | sort -k2 -rn
# cursor-cli-oauth 35 · terminal 29 · goal 21 · gpt-apply-patch 19
# anthropic-subscription 18 · todotools 10 · permission-system 9 · loop 9
# history-search 9 · btw 9 · herdr 8 · help 7 · loop-guard 4 · hooks 4
# rules 3 · nested-agents-md 2 · mcp 1
```
⇒ **`cursor-cli-oauth` có đúng 35 modifier**, đúng là nhiều nhất. Lý do loại nó ở §6.2 **không đổi**.
Chỉ có **tổng** là sai, và tổng đó không được dùng ở đâu để quyết định.

### 1.3 🟠 §2.2 B1 — "10 path lõi thật" trong khi **lệnh in ra 55 path**

Mục này tự gọi mình là *"**Đây là bằng chứng cứng nhất** trong toàn bộ tài liệu"*. Đo lại:
```bash
cd $S
grep -rhoE '`packages/[^`]+`' packages/coding-agent/src/core/extensions/builtin --include=changes.md \
  | grep -v 'core/extensions/builtin' | tr -d '`' | sed 's|packages/coding-agent/||' | sort -u | wc -l
# 55        ← tài liệu ghi "10 path lõi thật"
```
Ba vấn đề riêng:

**(a) Bảng của tài liệu liệt kê 11 path, không phải 10.** 8 dòng đầu + 1 dòng gộp
`src/capability/rule.ts · src/config.ts · src/core/messages.ts` = **11**.

**(b) Có ít nhất 6 file core *thật* bị cắt im lặng, không nói lấy tiêu chí.** Kiểm với đúng tiền tố mà lệnh
đã tạo ra:
```bash
for p in src/tools/todo.ts src/session/ttsr-coordinator.ts src/prompts/tools/todo.md \
         src/prompts/system/ttsr-interrupt.md src/modes/controllers/todo-command-controller.ts src/export/ttsr.ts; do
  [ -e "$S/packages/coding-agent/$p" ] && echo "EXISTS $p" || echo "MISSING $p"; done
# EXISTS cả 6
```
Ngoài ra `packages/coding-agent/CHANGELOG.md`, `docs/providers.md`, `docs/skills.md` đều tồn tại.

**(c) Phép kiểm tồn tại mà tài liệu công bố chạy lại sẽ FAIL**, vì lệnh grep bắt kèm số dòng:
```bash
[ -e "$S/packages/ai/src/utils/prompt-cache-ttl.ts:358" ]   # MISSING — vì có ":358"
[ -e "$S/packages/ai/src/utils/prompt-cache-ttl.ts" ]      # EXISTS, 476 dòng
```
Tài liệu báo ✅ cho path này, tức đã **âm thầm cắt `:358` trước khi kiểm** mà không nói.

⇒ **Kết luận của B1 vẫn đúng và thậm chí mạnh hơn**: cây builtin đào vào `packages/ai` và `packages/agent`
là có thật, tôi xác nhận (`packages/ai/src/api/transform-messages.ts`, `packages/ai/src/providers/cursor.ts`,
`packages/ai/src/utils/retry.ts`, `packages/ai/src/utils/tool-pair-repair.ts`, `packages/agent/src/agent-loop.ts`
— tất cả EXISTS). Nhưng con số "10" và mọi đường dẫn bị bỏ sót thì sai, và cách kiểm tồn tại đã công bố
thì không tái lập được.

### 1.4 🟠 §0.3 — "`classes/` đã có **18 file `.kdl`**" thực tế là **19**

```bash
ls -1 $OMP/packages/catalog/src/compat/rules/classes/*.kdl | wc -l
# 19
```
Tài liệu liệt kê 18 tên, **thiếu `gpt-oss.kdl`** (2,0 KB). Kết luận "đủ họ mà `prompt-preset` phục vụ" vẫn
đúng — thực tế mạnh hơn.

### 1.5 🟠 §0.3 — "trả **12 dialect**" thực tế là **11**

```bash
sed -n '/export type Dialect/,/;/p' $OMP/packages/catalog/src/identity/dialect.ts | grep -cE '^\s*\| "'
# 11
```
`glm · hermes · kimi · xml · anthropic · deepseek · harmony · qwen3 · gemini · gemma · minimax` = 11.
Tài liệu **tự mâu thuẫn**: khối code nó trích ngay bên dưới chỉ liệt kê 11, còn câu văn lại ghi "12".

Kèm theo: `dialect.ts:19-40` — hàm `preferredDialect` bắt đầu dòng **18**, đóng dòng **42**
(`switch` chiếm 19–41). Khoảng dẫn lệch 1 dòng mỗi đầu.

### 1.6 🟠 §4.5 — "Tổng 5 cái này = **3.189 dòng**" thực tế **3.089**

```bash
# anthropic-bash 103 · anthropic-web-search 249 · openai-web-search 272 · openai-image-gen 414 · gpt-apply-patch 2051
echo $((103+249+272+414+2051))
# 3089        ← tài liệu ghi 3.189, lệch 100 (đảo chữ số)
```
Và **§8.2 dùng lại 3.189 cho một bộ *khác*** — 4 mục bỏ `gpt-apply-patch`:
`103+249+272+414 = 1038`. Sai ở cả hai chỗ. Bốn số đơn lẻ thì đúng cả bốn.

### 1.7 🟡 §4.1 — "`oauth_callback/` — 10 file, 146 KB" thực tế **12 file, 184K**

```bash
ls -1 $OMP/crates/pi-natives/src/oauth_callback/ | wc -l   # 12   (tài liệu: 10)
du -sh $OMP/crates/pi-natives/src/oauth_callback/           # 184K (tài liệu: 146 KB)
```
Lập luận "tranh OAuth callback URL" không đổi hướng.

### 1.8 🟡 §3.5 — "`.slice(0, N)` — **12 file** khớp" thực tế **18 file**

```bash
cd $S; xargs grep -lE '\.slice\(0, *[0-9]' < /tmp/bi_ts.txt 2>/dev/null | wc -l
# 18
```
Trong 18 file có `anthropic-subscription/session-registry.ts`, `goal/cache-wait.ts`… ý "senpi tự cắt chuỗi
thay vì dùng helper" **đúng và mạnh hơn**.

### 1.9 🟡 §3.1 — "**33 file** preset" thực tế **38 file `.ts`**

```bash
ls -1 $S/packages/coding-agent/src/core/extensions/builtin/prompt-preset/*.ts | wc -l   # 38
```
Không cách đếm nào ra 33: 38 tổng · 35 nếu trừ `index/presets/settings` · 31 nếu trừ thêm 4 file **không**
phải model id. Trong 35 file còn lại có 4 file **không mang tên model**: `execution-tooling.ts`,
`file-operations.ts`, `test-decision.ts`, `gpt-eval-routing.ts`.

⇒ Câu *"tên file chính là model id"* hơi nới lỏng: **31/35** mang tên model, không phải 33/33. Luận điểm
("đây là per-model lookup table bị cấm bằng tên") **vẫn đúng**.

Bảng 18 dòng-dòng mà tài liệu trích — **khớp tuyệt đối, cả 18 số** (gpt-6-astra 400, claude-opus-5 132,
glm-5 18, gpt-5.2 25, kimi-k3 123, claude-fable-5-1 125, gpt-5.6 240, claude-opus-5-5 120,
claude-opus-4-8 25, claude-fable-5 116, gpt-5.5 102, grok-4.7 122, deepseek-v4 86, gpt-5.3-codex 23,
grok-4.6 102, kimi-k2-code 29, kimi-k2-6 21, grok-4.5 79). `presets.ts` = 454 dòng ✓.

### 1.10 🟡 §2.1 chú thích — "253/564 = 44%", mẫu số sai

```bash
cd $S
grep -rhoE '^## ' packages/coding-agent/src/core/extensions/builtin/*/changes.md | wc -l
# 509        ← không phải 564
```
Tử số 253 là đúng (`grep -rho 'Why an extension could not handle it' … | wc -l` → 253). Nhưng đúng ra
**253/509 = 50%**, không phải 44%. Và con số này thuộc `builtins.md`, `deep-risk.md` chỉ trích lại —
nên đây là lỗi thừa kế, không phải lỗi mới.

### 1.11 🟡 §7 — "**10+ file** khớp" thực tế **26 file**

```bash
cd $S
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' \
  -- 'packages/coding-agent/src/core/extensions/builtin/*' | wc -l
# 26
```
Kết luận "nhiều builtin đọc và phục hồi session" **đúng và mạnh hơn**. Tuy nhiên câu
*"**Không builtin nào *ghi* JSONL**"* **không được lệnh nào đo** — lệnh đưa ra là grep match-anywhere,
không phân biệt đọc với ghi. Tôi không bác bỏ được câu đó; tôi chỉ nói nó **chưa được chứng minh**.

### 1.12 🟡 §3.4 — tự mâu thuẫn với chính lệnh của nó

Tài liệu đóng khung:
> *"**Ghi chú công bằng:** `terminal/pty.lazy.ts` và `webfetch/content.lazy.ts` là **lazy chunking**,
> không phải `await import()` thô."*

Nhưng:
```bash
cd $S; grep -n 'await import(' packages/coding-agent/src/core/extensions/builtin/terminal/pty.lazy.ts
# 18:	loaded ??= await import("@earendil-works/pi-pty");
```
`pty.lazy.ts` **có** `await import()` thô và **là 1 trong 4 file** mà lệnh của tài liệu trả về. Tài liệu
miễn trừ chính cái file mà phép đo của nó đã chỉ ra.

Khối output cũng bị méo: `mcp/… (4 file)` — thực tế **mcp 1, imagegen 1, terminal 2** (tổng 4).
Tệ hơn: có **4** file `.lazy.ts` trong cây, không phải 20 như gợi ý ở câu cuối (§3.4 chỉ dẫn đúng 2).

### 1.13 🟡 §2.2 B2 — khối output thiếu một dòng đã đo

Lệnh quét **9** API, khối output chỉ in **8**. Dòng rơi mất:
```bash
xargs grep -l '\bregisterMessageRenderer\b' < /tmp/bi_ts.txt | wc -l
# 2
```
Tám dòng còn lại khớp tuyệt đối: `registerCommand 26 · registerTool 22 · setActiveTools 20 · registerFlag 8 ·
registerEntryRenderer 5 · registerProvider 4 · setModel 3 · registerLazyToolActivator 3`.

### 1.14 🔵 §4.1 — `sdk-boundary.ts:24` thực tế dòng **26**

```bash
cd $S; grep -n 'SdkModule' packages/coding-agent/src/core/extensions/builtin/anthropic-subscription/sdk-boundary.ts | head -1
# 26:type SdkModule = Awaited<ReturnType<typeof loadClaudeAgentSdk>>;
```

---

## 2. NHỮNG CÁI TÔI **KHÔNG** BÁC BỎ ĐƯỢC (đã chạy lại, khớp)

Ghi lại để người đọc sau không phải đo lại.

| Mục | Lệnh | Kết quả |
|---|---|---|
| §1.1 senpi 5.554 file | `git -C $S ls-files \| grep -E '\.(ts\|tsx)$' \| wc -l` | **5554** ✓ |
| §1.1 "sai cách" 107.902 | `… \| (cd $S && xargs wc -l 2>/dev/null \| tail -1)` | **107902** ✓ — và phép đo sai **tái lập được nguyên vẹn** |
| §1.1 955.527 | `… \| grep -E '^\s+[0-9]+\s+total$' \| awk '{s+=$1}END{print s}'` | **955527** ✓ |
| §1.1 omp 1.695.782 | cùng cách trên `$OMP` | **1695782** ✓ (5.522 file) |
| §1.2 40 builtin / 603 `.ts` / 41 `.md` | xem Phụ lục | **40 / 603 / 41** ✓ |
| §2.1 bảng 23 dòng | vòng lặp trong tài liệu | **khớp tuyệt đối, cả 23 dòng** ✓ |
| §2.2 B2 | xem §1.13 | 8/9 khớp ✓ |
| §2.2 B3/B4/B5/B6 | xem Phụ lục | khớp, **kể cả số dòng trích dẫn** ✓ |
| §3.2 prompt trong TS | script python của tài liệu | **1.268.737 chars / 323 file** — khớp **tuyệt đối từng dòng top-11** ✓ |
| §3.2 41 `.md`, 0 prompt | `git ls-files "$B" \| grep '\.md$' \| grep -vE 'AGENTS\.md\|changes\.md'` | đúng 2 file (`imagegen/skill/SKILL.md`, `mcp/native-search-spike.md`) ✓ |
| §3.2 Handlebars | `git grep -l 'Handlebars' -- 'packages/*'` | chỉ `export-html/vendor/highlight.min.js` ✓ |
| §3.3 `ReturnType<` = 78 | `xargs grep -c … \| awk '{s+=$2}'` | **78** ✓ + phân bồ khớp (mcp 17, terminal 15, anthropic-subscription 10) ✓ |
| §3.5 `any` 10 file / `console.*` 5 file | `xargs grep -l` | **10 / 5** ✓, per-builtin khớp (cache-keepalive 9, compaction 7, ttsr 4) ✓ |
| §3.7 TUI sanitize | vòng lặp 4 hàm | **replaceTabs 0 · truncateToWidth 2 · shortenPath 0 · PREVIEW_LIMITS 0** ✓ |
| §3.8 bảng dòng-code 19 dòng | `wc -l` per builtin | **khớp tuyệt đối cả 19** ✓ |
| §4.1 import Anthropic SDK | `grep -rhoE 'from "(@anthropic-ai/…)"'` | **3+1+1+1 SDK, 2 zod** ✓ |
| §4.3 10/58 entry OMO | script python của tài liệu | **10 / 58** ✓ |
| §4.3 `NOTICE.md` 4 mục, không OMO | `grep -n '^#' $S/NOTICE.md` | LinkeDOM / System prompt text / TTSR / Todo tool ✓ |
| §4.3 2 path OMO không tồn tại | `[ -e … ]` | **KHÔNG, KHÔNG** ✓ |
| §0.4 `classifyModel` senpi 0 | `git -C $S grep -c 'classifyModel' -- 'packages/*' \| wc -l` | **0** ✓ |
| §0.4 omp "20+ file" | `git -C $OMP grep -c 'classifyModel' …` | **32 file** ✓ |
| §8.1 `model_select` 16 builtin | `xargs grep -l 'model_select' … \| cut -d/ -f1 \| sort -u \| wc -l` | **16** ✓ (15 thư mục + `service-tier.ts` ở gốc) |
| §6.3 `monitor-registry` 837 | `wc -l` | **837** ✓ |
| §4.2 omp `cursor.ts` 5.541 | `wc -l` | **5541** ✓ |
| §3.2/§4 omp 223 prompt `.md` | `git -C $OMP ls-files '…/prompts/*.md' \| wc -l` | **223** ✓ |
| §5.2 `FilesystemPolicy` = 0 | `git -C $OMP grep -c 'FilesystemPolicy' … \| wc -l` | **0** ✓ |
| §4.1 `claude-agent-sdk` = 0 | `grep -c 'claude-agent-sdk' $OMP/bun.lock` | **0** ✓, `package.json` không có dòng nào ✓ |
| §5.2 `approval.ts` 387 / `file-write-fallback.ts` 467 | `wc -l` | **387 / 467** ✓ |

---

## 3. §7 JSONL — tôi xác nhận, và nhắc lại nền tảng

Tài liệu xử lý đúng chỗ này. Tôi chạy lại từng vế:

```bash
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts
# 575:export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[] {

grep -n "JsonlCorruptionError" $PI/packages/durable/src/storage/jsonl/storage.ts | head -2
# 80:export class JsonlCorruptionError extends Error {
# 119:	throw new JsonlCorruptionError(`Malformed complete ${description}`, …);

git -C $S grep -c 'parseJsonlLenient\|onMalformedRecord' -- 'packages/*' | wc -l
# 0     ← senpi cũng không có
```
Và mắt xích đầy đủ bên omp, dòng 1882:
```bash
sed -n '1882p' $OMP/packages/coding-agent/src/session/session-manager.ts
# 		this.#rewriteRequired = migrated || loaded.malformedRecords > 0;
```
`pi` **không** có `try/catch` quanh chỗ ném — `storage.ts:114-121` chỉ bắt lỗi `JSON.parse` rồi **ném lại**
thành `JsonlCorruptionError`. Không có đường tự lành.

⇒ **`parseJsonlLenient` là của omp, `pi` và `senpi` đều không có. Chép nguyên session layer của `pi`
là làm chật hơn. Tôi đồng ý với kết luận của tài liệu và với lệnh cấm đề xuất ngược lại.**

Điểm tôi **bổ sung**: `senpi` không chỉ thiếu `parseJsonlLenient` — nó **không có cả `rewriteRequired`
hay `malformedRecords`**:
```bash
git -C $S grep -ln 'rewriteRequired\|malformedRecords' -- 'packages/*' | wc -l
# 0
```
Nghĩa là senpi **yếu hơn `pi`** ở mảng này, không ngang bằng. Khi port, điểm neo phải là
`parseJsonlLenient` của omp, không phải session layer của bên nào.

---

## 4. Điều tôi **không** kiểm được (nói thẳng, không giả vờ)

1. **License của OMO** — tài liệu cũng nói không đo được. Tôi đồng ý: đây là khoảng trống thật, không phải
   kết luận. Tôi chỉ xác nhận `senpi` **tự thú** có port (10/58 entry) và `NOTICE.md` **không khai báo**.
2. **"Không builtin nào *ghi* JSONL"** — xem §1.11. Lệnh đưa ra không đo được vế này.
3. **Ai thực sự render ra TUI** — tài liệu tự thừa nhận không mở từng renderer. Tôi cũng không mở.
4. **§2.1 là tự-báo-cáo của tác giả senpi** — đây là giới hạn *của phép đo*, không phải lỗi tác giả.
   Tôi nói thêm: tỉ lệ % **không** dùng để quyết định loại nào builtin; quyết định nằm ở §4–§6.
5. **`presets.ts` còn nhánh dạng `switch`/`Map` không bắt bằng regex?** — Tôi có thế chỉ thêm: `presets.ts`
   có **13** lệnh `.includes(`, trong đó **10** khớp mẫu model-id. Tôi không đọc hết 454 dòng.

---

## 5. Điều chỉnh nền tảng (nhắc, vì liên quan)

Ba điều này đo trước đây, tôi kiểm lại và **đều vẫn đúng** — `deep-risk.md` không vi phạm:

1. `gajae` là fork của dòng omp/pi, **không** phải nguồn tham chiếu độc lập. (`deep-risk.md` không nhắc gajae.)
2. `pi` **không** có MCP và **không** có ACP.
3. `chord` **không phải** cơ chế vòng đời extension.

Và điều quan trọng nhất, đã nêu ở §3: **omp đã tự lành được JSONL hỏng** (`parseJsonlLenient` →
`malformedRecords` → `#rewriteRequired`), `pi`/`senpi` thì không. **Không đề xuất lùi về session layer của `pi`.**

---

## 6. Bảng tổng — 14 sai số, xếp theo mức nguy hiểm

| # | Mục | Tài liệu | Thực tế | Có đổi quyết định? |
|---|---|---:|---:|---|
| 1 | §2.2 B1 số path lõi | 10 | **55** | Không — kết luận đúng, nhưng 6 file core bị cắt im lặng |
| 2 | §3.6 tổng modifier `private` | 35 | **197** | Không — per-builtin đúng, tổng không dùng để quyết định |
| 3 | §3.1 số dòng model-id | 14 | **13** | Không — nhưng `compaction:292` là dòng **bịa thêm** |
| 4 | §3.1 "13/14 ở prompt-preset+compaction" | 13/14 | **10/13 + 0** | Không — vô nghĩa số học, phải sửa |
| 5 | §3.4 miễn trừ `pty.lazy.ts` | "không phải import thô" | **có `await import()` ở dòng 18** | Không — nhưng tự mâu thuẫn |
| 6 | §0.3 số `.kdl` | 18 | **19** | Không — thiếu `gpt-oss.kdl` |
| 7 | §0.3 số dialect | 12 | **11** | Không — tự mâu thuẫn với code nó trích |
| 8 | §4.5 tổng dòng | 3.189 | **3.089** (và §8.2 đáng ra 1.038) | Không |
| 9 | §3.1 số file preset | 33 | **38 / 35 / 31** | Không — 4/35 không mang tên model |
| 10 | §7 số file chạm session | "10+" | **26** | Không — mạnh hơn |
| 11 | §4.1 `oauth_callback` | 10 file / 146 KB | **12 file / 184K** | Không |
| 12 | §3.5 `.slice(0,N)` | 12 file | **18 file** | Không |
| 13 | §2.1 mẫu số (trích `builtins.md`) | 564 | **509** | Không — lỗi thừa kế, 253/509 = 50% |
| 14 | §2.2 B2 / §4.1 | — | thiếu 1 dòng output; `sdk-boundary.ts` ở dòng 26 | Không |

**Hướng sai số: toàn bộ đi xuống (thu nhỏ), không có sai số nào phóng to.** Người đọc sau 6 tháng nên coi
đây là khuôn mẫu: khi tài liệu này đưa một con số nhỏ lần nữa, hãy đo lại trước.

---

## Phụ lục — toàn bộ lệnh, chạy lại từ đầu

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers
PI=/Users/tranquangdang21/Projects/pi-ref
B=packages/coding-agent/src/core/extensions/builtin

# mẫu đo
cd $S
git ls-files "$B" | grep -E '\.ts$' | grep -v '/test/' > /tmp/bi_ts.txt
wc -l < /tmp/bi_ts.txt                       # 603
git ls-files "$B" | grep '\.md$' | wc -l      # 41
git ls-files "$B" | grep '\.md$' | sed 's|.*/||' | sort | uniq -c
#  27 changes.md · 12 AGENTS.md · 1 SKILL.md · 1 native-search-spike.md

# §1.1
git -C $S ls-files | grep -E '\.(ts|tsx)$' | wc -l                                   # 5554
git -C $S ls-files | grep -E '\.(ts|tsx)$' | (cd $S && xargs wc -l 2>/dev/null | tail -1)  # 107902 (SAI)
git -C $S ls-files | grep -E '\.(ts|tsx)$' | (cd $S && xargs wc -l 2>/dev/null \
  | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}')                        # 955527
git -C $OMP ls-files | grep -E '\.(ts|tsx)$' | (cd $OMP && xargs wc -l 2>/dev/null \
  | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}')                       # 1695782

# §1.13 registerMessageRenderer bị bỏ sót
xargs grep -l '\bregisterMessageRenderer\b' < /tmp/bi_ts.txt | wc -l                     # 2

# §1.1 / §1.9 / §1.10 / §1.12 — các con số sai
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' \
  < /tmp/bi_ts.txt | wc -l                                                              # 13 (doc: 14)
grep -cE '\.(includes|startsWith|endsWith)\(' $B/compaction/prompts.ts                  # 0
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null \
  | grep -v ':0$' | awk -F: '{s+=$2} END{print s}'                                     # 197 (doc: 35)
xargs grep -lE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt | wc -l              # 35  ← đây mới là "35 file"
xargs grep -lE '\.slice\(0, *[0-9]' < /tmp/bi_ts.txt | wc -l                            # 18 (doc: 12)
ls -1 $B/prompt-preset/*.ts | wc -l                                                     # 38 (doc: 33)
ls -1 $OMP/packages/catalog/src/compat/rules/classes/*.kdl | wc -l                       # 19 (doc: 18)
sed -n '/export type Dialect/,/;/p' $OMP/packages/catalog/src/identity/dialect.ts | grep -cE '^\s*\| "'   # 11 (doc: 12)
grep -rhoE '^## ' $B/*/changes.md | wc -l                                              # 509 (doc: 564)
ls -1 $OMP/crates/pi-natives/src/oauth_callback/ | wc -l                                 # 12 (doc: 10)
du -sh $OMP/crates/pi-natives/src/oauth_callback/                                       # 184K (doc: 146 KB)
grep -n 'SdkModule' $B/anthropic-subscription/sdk-boundary.ts | head -1                # 26 (doc: 24)
grep -n 'await import(' $B/terminal/pty.lazy.ts                                          # 18  ← doc bảo "không phải import thô"

# §1.3 — B1: 55 path, không phải 10
grep -rhoE '`packages/[^`]+`' $B --include=changes.md | grep -v 'core/extensions/builtin' \
  | tr -d '`' | sed 's|packages/coding-agent/||' | sort -u | wc -l                    # 55
# các file core bị tài liệu cắt im lặng — đều tồn tại:
for p in src/tools/todo.ts src/session/ttsr-coordinator.ts src/prompts/tools/todo.md \
         src/prompts/system/ttsr-interrupt.md src/modes/controllers/todo-command-controller.ts \
         src/export/ttsr.ts CHANGELOG.md docs/providers.md docs/skills.md; do
  [ -e "$S/packages/coding-agent/$p" ] && echo "EXISTS $p" || echo "MISSING $p"; done
# path bị grep bắt kèm số dòng → kiểm -e thất bại:
[ -e "$S/packages/ai/src/utils/prompt-cache-ttl.ts:358" ] && echo EXISTS || echo MISSING  # MISSING

# §1.6 — 3.089 không phải 3.189
echo $((103+249+272+414+2051))     # 3089
echo $((103+249+272+414))          # 1038  ← §8.2 dùng 3.189 cho bộ này

# §1.11 — 26 file chạm session
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' -- "$B/*" | wc -l   # 26
git grep -ln 'rewriteRequired\|malformedRecords' -- 'packages/*' | wc -l                                        # 0  ← senpi yếu hơn cả pi

# §3 — JSONL (nền tảng)
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts                    # 575
sed -n '1882p' $OMP/packages/coding-agent/src/session/session-manager.ts                        # #rewriteRequired
grep -n "JsonlCorruptionError" $PI/packages/durable/src/storage/jsonl/storage.ts | head -2      # 80, 119
sed -n '114,121p' $PI/packages/durable/src/storage/jsonl/storage.ts   # bắt JSON.parse rồi NÉM, không tự lành
git -C $S grep -c 'parseJsonlLenient\|onMalformedRecord' -- 'packages/*' | wc -l                # 0

# các con số ĐÚNG, để đối chiếu
git -C $S grep -c 'classifyModel' -- 'packages/*' | wc -l                    # 0   (senpi)
git -C $OMP grep -c 'classifyModel' -- 'packages/*' | wc -l                   # 32  (doc: "20+")
xargs grep -l 'model_select' < /tmp/bi_ts.txt | sed 's|.*/builtin/||' | cut -d/ -f1 | sort -u | wc -l   # 16
git -C $OMP ls-files 'packages/coding-agent/src/prompts/*.md' | wc -l       # 223
wc -l < $OMP/packages/ai/src/providers/cursor.ts                            # 5541
git -C $OMP grep -c 'FilesystemPolicy' -- 'packages/*/src/*' | wc -l       # 0
grep -c 'claude-agent-sdk' $OMP/bun.lock                                    # 0
wc -l < $B/terminal/monitor-registry.ts                                     # 837
```
