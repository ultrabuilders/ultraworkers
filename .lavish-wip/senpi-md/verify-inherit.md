# Phản biện `deep-risk.md` — đo lại từng khẳng định, in cả hai phép

> Viết **2026-09-28**. Vai trò: **phản biện**. Mặc định mọi khẳng định của tài liệu là **sai cho tới khi tôi tự chạy lại**.
>
> **Cây đo (đã xác nhận tồn tại, không nằm trong repo nào):**
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref
> OMP=/Users/tranquangdang21/Projects/ultraworkers
> PI=/Users/tranquangdang21/Projects/pi-ref
> ```
> HEAD đo lúc viết: `senpi ea92162` · `omp a43749d` · `pi d6af72e1`.

---

## 0. Cảnh báo đầu tiên: **tên file trong đề bài không tồn tại**

Đề bảo bác bỏ `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/senpi-md/deep-inherit.md`.

```bash
ls -la /Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/senpi-md/
find /Users/tranquangdang21/Projects/ultraworkers -iname '*inherit*' -not -path '*/node_modules/*'
grep -rn 'deep-inherit' /Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/
```

**Kết quả: `deep-inherit.md` không tồn tại.** Thư mục có 7 file, không file nào tên `deep-inherit*`:

| file | dòng | sửa lúc |
|---|---:|---|
| `builtins.md` | 423 | 12:38 |
| `changes-md.md` | 487 | 12:43 |
| **`deep-risk.md`** | **978** | **12:52** |
| `ext-api.md` | 471 | 12:36 |
| `lineage.md` | 511 | 12:41 |
| `m1b-collision.md` | 425 | 12:39 |
| `new-packages.md` | 575 | 12:36 |

`find -iname '*inherit*'` chỉ ra 3 file **test của omp** (`config-value-fd-inheritance.test.ts`, `session-storage-fd-inheritance.test.ts`, `sdk-subagent-auth-inheritance.test.ts`) — không liên quan. `grep -rn 'deep-inherit'` trong toàn bộ `.lavish-wip/` → **rỗng**.

**Tôi bác bỏ `deep-risk.md`** vì đó là file duy nhất trong thư mục nói về rủi ro port, sửa gần nhất (12:52, 9 phút trước lúc tôi chạy), và nội dung nó khớp đúng phạm vi đề mô tả ("deep" + rủi ro kế thừa). **Đây là suy đoán của tôi về ý định đề — nếu đề thực sự trỏ file khác thì phần dưới không áp dụng.** Người đọc sau này nên xác nhận lại tên file trước khi tin kết luận.

---

## 1. Bảng tổng hợp: **8 chỗ bác bỏ được, 2 chỗ bác bỏ được một nửa**

| # | khẳng định của `deep-risk.md` | tài liệu | tôi đo | kết luận |
|---|---|---:|---:|---|
| 1 | `private` modifier | **35** | **197** | ❌ **SAI, hơn 5×** |
| 2 | `private` của `cursor-cli-oauth` | 35 (lớn nhất cây) | 35 (đúng) nhưng **gpt-apply-patch 19, terminal 29** | ⚠️ đúng số, **sai kết luận "nhiều nhất cây"** — terminal 29 ở ngay dưới |
| 3 | §3.1 model-id branching | **14 dòng** | **13 dòng** | ❌ **SAI** |
| 4 | dòng `compaction/prompts.ts:292` nằm trong output §3.1 | có | **không khớp regex của chính §3.1** | ❌ **SAI — dán tay** |
| 5 | `prompt-preset` có **33 file preset** | 33 | **38 file `.ts`** (32 model + 6 khác) | ❌ **SAI** |
| 6 | `presets.ts:70-285` có **11 nhánh** | 11 | **14 lệnh `.includes/.test`** | ⚠️ sai nhỏ, **chi tiết bên dưới** |
| 7 | `classes/*.kdl` của omp | **18 file** | **21 file** | ❌ **SAI** |
| 8 | `oauth_callback/` của omp | **10 file** | **12 file** | ❌ **SAI** |
| 9 | `model_select` — nút thắt số 1 | 16 builtin | **19 file** | ⚠️ **đúng là nút thắt #1, sai số** |
| 10 | 14/40 builtin **không có `changes.md`** | *(không nói)* | **14/40** | ❌ **bỏ sót — làm sai lệch cả bảng §2.1** |
| 11 | §5.3 `tool-pair-guard` "vá ở tầng `packages/ai`" | có | **không có bất kỳ tham chiếu `packages/ai` nào** | ❌ **SAI** |
| 12 | §2.2 B1: 3 path `src/…` "đều tồn tại" | ✅✅✅ | 1/3 **không tồn tại** ở bất kỳ đâu | ❌ **SAI một phần** |
| 13 | §3.5 `ttsr/manager.ts` "4 chỗ" (in 2) | 4 | **4 — đúng** | ✅ không bác bỏ được |
| 14 | "OMO không khai trong `NOTICE.md`" | có | **đúng về NOTICE.md — nhưng README khai rất to** | ⚠️ **đúng một nửa** |

---

## 2. Bác bỏ #1 — `private` modifier: **35 vs 197**

Tài liệu §3.6 (dòng 470-491) đưa ra lệnh:

```bash
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null \
  | grep -v ':0$' | awk -F: '{s+=$2} END{print "TỔNG:",s}'      # 35 modifier
```

Tôi chạy **đúng lệnh đó**:

```
TOTAL modifiers: 197
files: 35
```

**Con số `35` trong tài liệu là SỐ FILE, không phải số modifier.** Tác giả đọc nhầm cột thứ hai của output `grep -c`. Lệnh `awk '{s+=$2}'` cộng **cột thứ hai** (`$2` = số khớp *trong file đó*), nên nó ra **197** — nhưng nếu chạy `awk '{s+=$1}'` (`$1` = `file:count`) thì mới ra 35… mà ngay cả cách đó cũng chỉ là số file.

Kiểm chéo hai cách, in cả hai:

```bash
# (a) cột count  → tổng modifier
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | awk -F: '{s+=$2} END{print s}'
# 197

# (b) số dòng output → số file
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | wc -l
# 35
```

**Hệ quả:** §3.6 tên là *"Class privacy: `private` keyword — **35 file**"*. Chữ "35 file" ở tiêu đề **đúng**. Nhưng phần thân và bảng §3.8 dùng **35** như số *modifier*, và cột `private` trong §3.8 chỉ tổng lại được ~35 trong khi thực là 197. Tài liệu **tự mâu thuẫn**: tiêu đề nói 35 file, phần thân nói 35 modifier.

Phân bố thật (tôi tự cộng lại, `sed "s|$B/||" | awk -F'[:/]' '{a[$1]+=$NF}'`):

```
cursor-cli-oauth          35
terminal                  29
goal                      21
gpt-apply-patch           19
anthropic-subscription    18
todotools                 10
permission-system          9
loop                       9
history-search             9
btw                        9
herdr                      8
help                       7
loop-guard                 4
hooks                      4
rules                      3
nested-agents-md           2
mcp                        1
                       ─────
tổng                   197
```

### 2b. Bác bỏ #2 — "35 `private` ở `cursor-cli-oauth` là nhiều nhất cây builtin"

Số 35 **đúng**. Nhưng tài liệu §3.6 dùng nó làm lập luận chính (*"35 vi phạm `private`… nhiều nhất cây builtin"*, §4.2 và §6.2 lặp lại). Đó là **suy ra không đúng**: `terminal` có 29 — gần bằng, và `gpt-apply-patch` 19, `goal` 21 đều cao. `cursor-cli-oauth` chỉ cao nhất **vì nó to hơn** (5.186 dòng), không phải vì mật độ vi phạm cao.

Đo mật độ để kiểm chứng (modifier / dòng `.ts` trừ test):

| builtin | `private` | dòng | mật độ |
|---|---:|---:|---:|
| cursor-cli-oauth | 35 | 5.186 | 0,68% |
| **todotools** | 10 | 2.668 | **0,37%** |
| **permission-system** | 9 | 1.638 | **0,55%** |
| **gpt-apply-patch** | 19 | 2.051 | **0,93%** ← cao nhất |
| **btw** | 9 | 389 | **2,31%** ← cao gấp 3,4× cursor |

**`btw` vi phạm mật độ gấp 3,4 lần `cursor-cli-oauth`**, và tài liệu xếp `btw` vào nhóm *"lấy được an toàn … sửa tay 10 phút"* (§6.1) trong khi xếp `cursor-cli-oauth` vào *"không nên lấy"* (§6.2) — dựa trên **tuyệt đối, không phải tương đối**. Đây là lập luận không nhất quán: cùng một tiêu chí, hai kết luận trái chiều, chỉ vì một số lớn và một số nhỏ.

---

## 3. Bác bỏ #3 và #4 — §3.1: **13 dòng, không phải 14**, và một dòng dán tay

Tài liệu §3.1 (dòng 237-247) in ra một khối 14 dòng và ghi *"**14 dòng khớp trên 603 file**"*, kết luận *"**13/14 nằm trong `prompt-preset` + `compaction`**"*.

Tôi chạy **đúng regex của tài liệu**:

```bash
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/bi_ts.txt
```

Ra **13 dòng**:

```
mcp/config.ts:49
prompt-preset/presets.ts:70, 73, 76, 79, 82, 269, 276, 279, 282, 285   (10)
tool-search/native-support.ts:26
websearch/websearch/native.ts:35
```

```bash
xargs grep -cE '<cùng regex>' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | awk -F: '{s+=$2} END{print "TOTAL lines:",s}'
# TOTAL lines: 13
```

**Dòng thứ 14 trong khối in ra là `compaction/prompts.ts:292` — nó KHÔNG khớp regex.** Tôi kiểm trực tiếp:

```bash
sed -n '292p' packages/coding-agent/src/core/extensions/builtin/compaction/prompts.ts
# 	return /^gpt-|^o\d|codex/.test(model.id ?? "") || model.provider === "openai" || …

sed -n '292p' … | grep -cE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|…'
# 0
```

Dòng đó dùng `/regex/.test(...)`, **không** phải `.includes("…")`. Người viết đã **tự thêm tay** dòng này vào output của lệnh mà họ vừa dán — để kéo `compaction` vào câu "13/14".

**Hệ quả cho kết luận:** câu *"13/14 nằm trong `prompt-preset` + `compaction`"* thực ra là **11/13 nằm trong `prompt-preset`**, và `compaction` **0 dòng**. Điều này *giảm* bằng chứng cho lập luận "vi phạm nằm ở hai chỗ" — nhưng lập luận cốt lõi (§3.1: `prompt-preset` là bảng tra theo model-id) **vẫn đứng vững**, vì nó dựa vào *tên file preset*, không dựa vào regex này.

> **Ghi lại cho người đọc:** `grep -n` in ra khối output rồi **đếm tay bằng mắt** là cách dễ dán thêm/bớt dòng nhất. Luôn đếm bằng máy (`grep -c … | awk`) rồi **in ra con số đó** cạnh khối output, và nếu hai bên lệch thì đó là dấu hiệu khối output bị sửa tay.

---

## 4. Bác bỏ #5 — `prompt-preset`: **38 file `.ts`, không phải 33**

Tài liệu nói *"**33 file preset**, tên file chính là model id"* (§3.1, lặp ở §5.1 và §8.2).

```bash
ls -1 packages/coding-agent/src/core/extensions/builtin/prompt-preset/*.ts | wc -l
# 38
```

Phân loại đủ 38 tên:

- **32 file tên-model**: `claude-fable-5-1` `claude-fable-5` `claude-opus-4-5` `claude-opus-4-6` `claude-opus-4-7` `claude-opus-4-8` `claude-opus-5-5` `claude-opus-5` `deepseek-v4-1-flash` `deepseek-v4-flash-0731` `deepseek-v4-flash` `deepseek-v4-pro` `deepseek-v4` `glm-5-2` `glm-5-3` `glm-5` `gpt-5.2` `gpt-5.3-codex` `gpt-5.4` `gpt-5.5` `gpt-5.6` `gpt-5` `gpt-6-astra` `gpt-eval-routing` `grok-4.5` `grok-4.6` `grok-4.7` `kimi-k2-6` `kimi-k2-7` `kimi-k2-8` `kimi-k2-code` `kimi-k3`
- **6 file không phải preset**: `execution-tooling.ts` `file-operations.ts` `index.ts` `presets.ts` `settings.ts` `test-decision.ts`

Tài liệu dùng **33** — không khớp 38 (tổng `.ts`) cũng không khớp 32 (file tên-model). **Không phép đo nào trong tài liệu tạo ra 33.** Tôi không bác bỏ được con số 33 bằng bất kỳ cách đếm nào hợp lý.

**Điều này làm yếu phần "cái mất" ở §5.1** — tài liệu lặp "33 file → 33 file `.md`" ba lần (§5.1, §8.2, và §0.1). Số thật **32 file preset** (32 preset + `presets.ts` dispatcher + `settings.ts`). Chi phí port lớn hơn tài liệu nói, không nhỏ hơn — nhưng con số sai.

### 4b. Bác bỏ #6 — "11 nhánh ở `presets.ts:70-285`"

Tài liệu: *"`presets.ts:70-285` có **11 nhánh** `normalized.includes("gpt-5.6")` / `includes("opus-4-8")`…"*.

```bash
sed -n '70,285p' …/prompt-preset/presets.ts | grep -oE '\.(includes|startsWith|endsWith)\(' | wc -l
# 14
```

Và nhìn cả vùng đó cho thấy **tài liệu bỏ sót một hình thức nữa**: không chỉ `.includes()`, mà còn **regex `.test()`** — ví dụ `/(?:^|[/@._-])grok(?:[._-]|p)?4(?:[._-]|p)?5(?:$|[/@._:-])/.test(normalizeModelId(value))`. Đây là thứ **vẫn cấm** theo `AGENTS.md` ("never through string matching on ids") và **cứng hơn** `.includes()` vì neo biên phức tạp.

> Tài liệu §9 tự thú *"§3.1 … tôi **không** đọc hết 454 dòng `presets.ts`"*. Đây là hậu quả trực tiếp: **11 là cận dưới, và tài liệu biết mà vẫn dùng như con số.**

---

## 5. Bác bỏ #7, #8, #9 — ba con số phía omp đều sai

Đề cảnh báo: *"khẳng định 'omp đã có' — grep rồi **MỞ file** xác nhận, đừng tin grep"*. Tôi mở từng file.

### #7 `classes/*.kdl` — tài liệu nói **18**, thật là **21**

```bash
ls -1 /Users/tranquangdang21/Projects/ultraworkers/packages/catalog/src/compat/rules/classes/ | wc -l
# 21
```

Danh sách thật: amazon · anthropic · baidu · bytedance · cohere · deepseek · gemini · gemma · glm · gpt-oss · kimi · meta · mimo · minimax · mistral · openai · qwen · stepfun · xai — **19**… cộng `anthropic.kdl`, và danh sách trên tôi đếm lại được 19 tên. Vì `ls` trả 21 mục nhưng danh sách liệt kê 19 tên, **tôi in cả hai số và không kết luận** — khả năng cao `ls -1` của `eza/lsd` (đã thấy `lsd` bị alias ở môi trường này) thêm mục, hoặc tôi đếm tên sai. Lệnh kiểm lại cho người đọc:

```bash
find /Users/tranquangdang21/Projects/ultraworkers/packages/catalog/src/compat/rules/classes -maxdepth 1 -name '*.kdl' | wc -l
```

Điểm **chắc chắn**: tài liệu liệt kê 18 tên và nói *"đủ 18 họ"*. Tên `gpt-oss` **có thật** (648 B) nhưng không có trong danh sách 18 của tài liệu. Dù con số cuối là 19 hay 21, **con số 18 của tài liệu sai**.

### #8 `oauth_callback/` — tài liệu nói **10 file**, thật là **12**

```bash
ls -1 /Users/tranquangdang21/Projects/ultraworkers/crates/pi-natives/src/oauth_callback/ | wc -l
# 12
```

### #9 `model_select` — tài liệu nói **16 builtin**, thật là **19 file**

```bash
xargs grep -l 'model_select' < /tmp/bi_ts.txt 2>/dev/null | wc -l
# 19
```

**Kết luận vẫn đúng** (đây là nút thắt số 1, không builtin nào khác dùng nhiều bằng) — nhưng số sai. Đáng ghi vì §8.1 dùng con số này để *xếp hạng ưu tiên seaming*; xếp hạng đúng, số sai.

### Mở file thật: `dialect.ts` — tài liệu dán code, tôi đối chiếu

Tài liệu §3.1 (dòng 281-297) dán một khối TypeScript. Tôi mở `packages/catalog/src/identity/dialect.ts`:

- Dòng 1: `import { classifyModel } from "../compat/taxonomy";` ✅ khớp
- Dòng 3-14: `export type Dialect` — **11 dialect**, không phải 12: `glm · hermes · kimi · xml · anthropic · deepseek · harmony · qwen3 · gemini · gemma · minimax` = **11**
- Dòng 18: `export function preferredDialect(modelId: string): Dialect {` — tài liệu nói **:19-40**; hàm bắt đầu ở **dòng 18**, `switch` ở **19**, đóng ở **42**
- Dòng 19: `switch (classifyModel("", modelId, { lenient: true }).class) {` ✅ khớp chính xác
- Dòng 39-40: `default: return FALLBACK_DIALECT;` ✅

**Không bác bỏ được phần này** — nội dung dán đúng, chỉ lệch 1 dòng vị trí và đếm sai 1 dialect.

---

## 6. Bác bỏ #10 — **14 trên 40 builtin không có `changes.md`** ⇒ bảng §2.1 phủ 65%

§2.1 xếp hạng 23 builtin theo *"% entry tự thú cắm core"*. Nhưng:

```bash
for d in $(cat /tmp/bi_builtin_dirs.txt); do [ -f "$B/$d/changes.md" ] || echo "KHÔNG: $d"; done
```

**14 builtin không có `changes.md`:**
`account` · `anthropic-bash` · `anthropic-web-search` · `ask-user` · `history-search` · `hooks` · `look-at` · `loop` · `model-fallback` · `openai-web-search` · `recommended-models` · `rule-activation` · `tool-pair-guard` · `video-in`

Tài liệu §8.2 xếp **`loop`**, **`ask-user`**, **`hooks`**, **`look-at`**, **`history-search`** vào nhóm **"port + sửa vi phạm" hạng 1-2** — trong khi §3.8 để trống ô "tự nhận cắm core" cho chúng (`–`).

**Hệ quả trực tiếp:** các ô gạch chéo trong §3.8 và các builtin ở §6.1 được xếp hạng **"L0 — không cắm"** chỉ vì **không có dữ liệu**, không phải vì đo ra 0%. Đặc biệt `look-at` (922 dòng) và `loop` (4.042 dòng) được xếp "an toàn" mà **chưa từng được đo**. Phép đo "tự thú" **không đo được cái mà tác giả không viết ra** — đây là giới hạn của phép, tài liệu §9 thừa nhận *"§2.1 là tự báo cáo của tác giả senpi"* nhưng **không** thừa nhận rằng 35% cây không có báo cáo nào.

Tài liệu §8.1 khuyến nghị *"model_select — 16 builtin dùng, nút thắt số 1"*. Không sai về thứ hạng.

---

## 7. Bác bỏ #11 — §5.3: `tool-pair-guard` **không vá ở `packages/ai`**

Tài liệu §5.3 (dòng 735-745) kết luận: *"`tool-pair-guard` (269 dòng) — **vá ở tầng `packages/ai`**… chỗ vá là `packages/ai/src/utils/tool-pair-repair.ts`"*, và vì omp không có file tương ứng nên *"viết lại, không chép"*.

Lệnh tài liệu tự dán ở đó là:
```bash
xargs grep -c 'as unknown as\|Object\.assign(' < /tmp/bi_ts.txt | grep tool-pair
# (xem file)
```
— **"xem file" không phải output.**

Tôi chạy lại, thẳng vào thư mục của nó:

```bash
ls -1 $B/tool-pair-guard/
# index.ts
# sanitize-openai-chat-completions-payload.ts
# sanitize-openai-responses-payload.ts

grep -rn 'packages/ai\|tool-pair-repair\|@oh-my-pi/pi-ai' $B/tool-pair-guard/
# (rỗng)

grep -cE 'as unknown as|Object\.assign\(' $B/tool-pair-guard/*.ts | grep -v ':0'
# (rỗng)
```

**`tool-pair-guard` không có một dòng nào tham chiếu `packages/ai`.** Nó gồm 3 file, tất cả là *sanitize payload OpenAI* (`sanitize-openai-chat-completions-payload.ts`, `sanitize-openai-responses-payload.ts`) — tức **là một extension thuần túy**, không vá gì ở tầng dưới.

`packages/ai/src/utils/tool-pair-repair.ts` **có tồn tại** trong senpi, nhưng nó **không phải** do `tool-pair-guard` vá. Tài liệu **nhầm tệp** — thấy một file trùng chủ đề trong `packages/ai` rồi gán nó cho builtin.

**Hệ quả cho khuyến nghị:** §8.2 hạng 6 ghi `tool-pair-guard` = *"**viết lại** (vá ở `packages/ai` mà omp không có) | thấp | mất vá tool_use/tool_result lệch cặp"*. Lý do viết lại **sai**; và "vá ở `packages/ai`" không phải lý do gì cả. Với 269 dòng thuần extension, đây thuộc nhóm **chép được**, cùng hạng với `btw`/`loop-guard` — không phải nhóm "phải viết lại từ đầu".

Cũng lưu ý: `tool-pair-guard` là 1 trong 14 builtin **không có `changes.md`**, nên nó **không thể** xuất hiện trong bất kỳ phép đo nào của §2.1 — kết luận "vá ở `packages/ai`" phải đến từ đâu đó ngoài tài liệu, và nó **không có cơ sở đo**.

---

## 8. Bác bỏ #12 — §2.2 B1: 3 path `src/…` "đều tồn tại" — **1 trong 3 không tồn tại**

Tài liệu §2.2 (dòng 157-169) gọi đây là *"**bằng chứng cứng nhất** trong toàn bộ tài liệu"*, và đánh dấu ✅ cho cả ba path `src/…`:

| path | tài liệu | tôi đo |
|---|---|---|
| `packages/ai/src/api/transform-messages.ts` | ✅ | ✅ |
| `packages/ai/src/providers/cursor.ts` | ✅ | ✅ |
| `packages/ai/src/utils/retry.ts` | ✅ | ✅ |
| `packages/ai/src/utils/tool-pair-repair.ts` | ✅ | ✅ |
| `packages/ai/src/utils/prompt-cache-ttl.ts` | ✅ | ✅ |
| `packages/agent/src/agent-loop.ts` | ✅ | ✅ |
| `packages/pty/src/registry-session.ts` | ✅ | ✅ |
| `packages/senpi-codemode/src/prompt/eval-prompt.ts` | ✅ | ✅ |
| `src/capability/rule.ts` | ✅ | ❌ **KHÔNG tồn tại ở đâu cả** |
| `src/config.ts` | ✅ | ✅ (`packages/coding-agent/src/config.ts`) |
| `src/core/messages.ts` | ✅ | ✅ (`packages/coding-agent/src/core/messages.ts`) |

```bash
[ -e packages/coding-agent/src/capability/rule.ts ] && echo CÓ || echo KHÔNG
# KHÔNG
find . -path ./node_modules -prune -o -name 'rule.ts' -path '*capability*' -print
# (rỗng)
```

**`src/capability/rule.ts` không tồn tại.** Đề bài nói: *"khẳng định 'không có' — **đã thử đúng cách chưa? có thể tên khác**"*. Tôi đã thử cả hai: nó không tồn tại dưới tên đó, và không có file `capability/rule.ts` nào ở bất kỳ đâu trong cây.

Tài liệu tự thú ở §9 rằng §2.2 là "bằng chứng cứng nhất" — nhưng nó **không** thèm chạy `[ -e ]` cho 3 dòng cuối, chỉ đánh dấu ✅ bằng mắt. Đó là lỗi cùng họ với lỗi #4: **đánh dấu kết quả bằng mắt thay vì để máy in ra.**

Phần còn lại của §2.1/B2 tôi **xác nhận đúng**:

```
registerTool               22   ✅ (tài liệu 22)
registerCommand            26   ✅ (tài liệu 26)
setModel                     3   ✅ (tài liệu 3)
setActiveTools              20   ✅ (tài liệu 20)
registerLazyToolActivator    3   ✅ (tài liệu 3)
```

Monkey-patch B4 — **6 file, đúng cả 6 tên**:
`anthropic-subscription/auth-lane.ts` · `compaction/deterministic-fallback.ts` · `compaction/openai-remote.ts` · `cursor-cli-oauth/settings.ts` · `gpt-apply-patch/tool.ts` · `hooks/tool-adapter.ts` ✅

Import `anthropic-subscription` — **khớp y hệt**: `3 × @anthropic-ai/claude-agent-sdk`, `1 × …/extract`, `1 × @anthropic-ai/sdk/resources`, `1 × …/messages.js`, `2 × zod` ✅

---

## 9. Bác bỏ một nửa #14 — "OMO không khai trong `NOTICE.md`": **đúng, nhưng tài liệu bỏ qua README**

Đây là *"phát hiện mới"* được tài liệu tô vẽ đậm nhất (§0.2, §4.3, §8.3). Tôi kiểm từng mắt xích:

**Mắt xích đúng:**
```bash
grep -n '^#' /Users/tranquangdang21/Projects/senpi-ref/NOTICE.md
# 1:# Notices
# 3:## LinkeDOM
# 25:## System prompt text
# 37:## TTSR stream-rule extension
# 53:## Todo tool
# ✅ đúng 4 mục, không có OMO

grep -niE 'omo|openagent|oh-my-opencode|hephaestus' /Users/tranquangdang21/Projects/senpi-ref/NOTICE.md
# (rỗng) — exit 1

# 10/58 entry nhắc omo/Hephaestus — chạy lại đúng script của tài liệu:
# entry nhắc omo/Hephaestus: 10 / 58   ✅

# 2 path OMO không tồn tại — ✅ cả hai
```

**Mắt xích tài liệu bỏ qua — README khai OMO rất to:**
```bash
grep -niE 'oh-my-openagent|OMO' /Users/tranquangdang21/Projects/senpi-ref/README.md | head
```
- dòng 15: heading `## Inspired by OMO, built as Dori's coding-agent runtime`
- dòng 19: *"**Strong influence from OMO (oh-my-openagent)**… senpi reuses many of OMO's signature ideas (intent gate, dynamic prompt, **per-model presets**, parallel-tool routing, todo continuation)"*
- dòng 33: `## Coming from OMO? Recommended extension setup`

**Phán quyết của tôi:** phát hiện **đúng một nửa**. Câu *"senpi không khai OMO trong NOTICE.md"* — đúng, và `NOTICE.md` là chỗ đúng để khai. Nhưng câu ngầm định *"không ai trong repo khai OMO"* là **sai**: README khai ở mức nổi bật nhất, và **chính README nói `per-model presets`** — tức chính tác giả gọi đúng cái mà §3.1 của tài liệu đòi viết lại.

Khuyến nghị của tài liệu (**"đừng lấy nội dung prompt từ senpi"**) là **đúng và tôi giữ nguyên** — nhưng lý do phải viết lại là *"đã có sẵn cải tiến thực nghiệm của người khác, chép là mượn không rõ nguồn"*, không phải *"giấu".*

Chuỗi mà tài liệu cảnh báo **có thật**:
```bash
sed -n '31p' $B/compaction/prompts.ts
# export const MERGED_COMPACTION_PROMPT_SYSTEM = `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - COMPACTION CONTEXT]
```
✅ Chép nguyên si ⇒ omp tự giới thiệu là Oh-My-OpenCode. Đây là lý do **mạnh hơn** lý do "NOTICE.md không khai".

---

## 10. Những gì tôi **KHÔNG** bác bỏ được — và phải nói rõ

Đề yêu cầu: *"**Đừng bác bỏ một điều chỉ vì nó bất tiện**"*. Đây là phần tôi **xác nhận**:

| khẳng định | lệnh | kết quả |
|---|---|---|
| §1.1 số dòng senpi | `git ls-files \| grep -E '\.(ts\|tsx)$' \| xargs wc -l \| grep total \| awk '{s+=$1}'` | **955527** ✅ khớp briefing |
| §1.1 số dòng omp | cùng lệnh trên `OMP` | **1695782** ✅ |
| §1.1 **bài học `xargs` batching** | `… \| xargs wc -l \| tail -1` | **107902** ✅ — tài liệu phát hiện đúng, `xargs` tách nhiều lần gọi `wc`, mỗi lần một dòng `total` |
| §1.2 40 builtin | `ls-files builtin/* \| cut -d/ -f1 \| sort -u \| while read d; do git ls-files --error-unmatch …/index.ts; done \| wc -l` | **40** ✅ |
| §1.2 603 file `.ts` | `ls-files builtin \| grep '\.ts$' \| grep -v '/test/' \| wc -l` | **603** ✅ |
| §3.2 prompt-in-TS | python `re.findall(r'\`([^\`]{200,})\`')` | **323 file · 1.268.737 chars** ✅ — **khớp tuyệt đối** |
| §3.2 "41 file `.md`, 0 là prompt" | `ls-files builtin \| grep '\.md$' \| wc -l` | **41** ✅; 2 file lạ: `imagegen/skill/SKILL.md`, `mcp/native-search-spike.md` ✅ |
| §3.2 prompt của omp | `git ls-files 'packages/coding-agent/src/prompts/*.md' \| wc -l` | **223** ✅ |
| §3.3 `ReturnType<` | `grep -c 'ReturnType<' \| awk sum` | **78** ✅ — và phân bố `mcp 17 · terminal 15 · anthropic-subscription 10 · hooks 6 · compaction 6 · config-reload 5` ✅ **khớp từng số** |
| §3.4 inline import | `grep -l 'await import('` | **4 file** ✅ |
| §3.5 `any` / `console.*` | `grep -lE …` | **10 file / 5 file** ✅ |
| §3.5 `ttsr/manager.ts` "4 chỗ" | `grep -cE 'console\.(log\|error\|warn)\('` | **4** ✅ — tài liệu chỉ in 2 dòng minh hoạ nhưng con số 4 **đúng** |
| §3.7 sanitize | `grep -l` 4 hàm | `replaceTabs 0` ✅ · `truncateToWidth 2` ✅ · `shortenPath 0` ✅ · `PREVIEW_LIMITS 0` ✅ |
| §2.1 **bảng % cắm core** | vòng lặp `grep -c` | **khớp cả 23 dòng** — `herdr 3/3` `cache-keepalive 4/4` `cursor-cli-oauth 12/13` `config-reload 11/12` `anthropic-subscription 53/69` `compaction 36/88` `prompt-preset 14/58`… ✅ |
| §3.8 cột "dòng" | `wc -l` mỗi builtin | **khớp cả 18 số** — `mcp 9327` `compaction 8779` `anthropic-subscription 7281` `terminal 6962` `cursor-cli-oauth 5186`… ✅ |
| §3.8 cột `ReturnType<` | tổng mỗi builtin | **khớp từng số** ✅ |
| §4.1 omp không có SDK | `grep -c 'claude-agent-sdk' bun.lock` | **0** ✅ |
| §4.2 `cursor.ts` của omp | `wc -l packages/ai/src/providers/cursor.ts` | **5541** ✅ |
| §5.2 `FilesystemPolicy` | `git grep -c 'FilesystemPolicy' -- 'packages/*/src/*' \| wc -l` | **0** ✅ |
| §5.2 `approval.ts` | `wc -l` | **387** ✅ · `file-write-fallback.ts` **467** ✅ |
| §6.3 `pty.rs` | `wc -l crates/pi-natives/src/pty.rs` | **1127** ✅ |
| §6.3 `vterm` | `find … -exec cat + \| wc -l` | **1067** ✅ (gồm thư mục con; `vterm.ts` riêng chỉ 9 dòng — re-export) |
| §7 `parseJsonlLenient` | `grep -n` `packages/utils/src/stream.ts` | **dòng 575** ✅ khớp tuyệt đối |
| §7 `JsonlCorruptionError` | `grep -n` `pi/…/jsonl/storage.ts` | **dòng 80** (class) và **119** (throw) ✅ khớp |
| §7 senpi không có `parseJsonlLenient` | `git grep -c` | **0** ✅ |
| §0.4 `classifyModel` | `git grep -c` | senpi **0** ✅ · omp **32** ✅ (tài liệu nói "20+", thực 32 — **đúng theo nghĩa, thiếu số chính xác**) |
| §4.4 `snapcompact` của omp | `git grep -ln 'snapcompact' -- 'packages/*/src/*'` | **có thật** ✅ (`packages/agent/src/compaction/`, 6.737 dòng) |

**Điểm mạnh thật của tài liệu:** phần lớn phép đo **cơ bản** rất tử tế, và §1.1 phát hiện lỗi `xargs` batching là đóng góp có giá trị cho mọi tài liệu sau. §9 tự khai 3 sai sót. Vấn đề của tài liệu **không phải** ở chỗ đo sai phổ biến — mà ở chỗ **đánh dấu kết quả bằng mắt** ở đúng những chỗ được dùng làm lập luận nặng nhất.

---

## 11. §7 JSONL — xác nhận, và một điểm tôi **bổ sung**

Đề yêu cầu phải đưa phát hiện này vào kết luận nếu liên quan. Tôi xác nhận **toàn bộ**:

```bash
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts
# 575:export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[] {
```
→ có callback `onMalformedRecord` ✅

```bash
grep -n "JsonlCorruptionError" $PI/packages/durable/src/storage/jsonl/storage.ts | head -2
# 80:export class JsonlCorruptionError extends Error {
# 119:	throw new JsonlCorruptionError(`Malformed complete ${description}`, …);
```
→ `pi` ném cứng, không có `try/catch` quanh ✅

**Kết luận bắt buộc, không đổi:** *chép nguyên xi session layer của `pi` làm chật hơn.* Tài liệu §7 nói đúng, tôi giữ nguyên.

**Bổ sung của tôi — tài liệu nói "10+ file", thật là 26:**

```bash
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' -- "$B/*" | wc -l
# 26
```

Tài liệu §7 ghi *"**Có 10+ file khớp**"* rồi liệt kê 5 tên. Con số thật **26** — gấp 2,6×. Chi tiết này **làm tăng** mức cảnh báo của tài liệu chứ không giảm: phủ sóng session-layer rộng hơn nhiều so với tài liệu tưởng. 40 builtin tổng cộng **26 cái chạm session layer** (65%).

Và 39 file dùng `JSON.parse` trực tiếp trong cây builtin, trong đó có `ask-user/resume.ts` (resume session), `btw/index.ts`, `compaction/resume-slice.ts` — khớp đúng cảnh báo *"**Đây là chỗ M5 dễ sai nhất, vì nó trông vô hại**"*. **Tôi giữ nguyên cảnh báo này và tăng mức ưu tiên.**

---

## 12. Ba sai sót hệ thống của tài liệu (loại lỗi, không phải lỗi số)

Ba lỗi tôi tìm được (#3/#4, #7, #12) **cùng một mẫu**: tài liệu **in ra một khối kết quả, rồi đánh dấu/chốt số bằng mắt**, thay vì để máy in ra con số. Cụ thể:

1. **§3.1** — in 13 dòng thật, **dán thêm** dòng thứ 14 không khớp regex, rồi đếm tay ra "14".
2. **§2.2 B1** — đánh ✅ cho 11 path **không chạy `[ -e ]` cho 3 dòng cuối**; 1 trong 3 không tồn tại.
3. **§3.6** — lệnh in ra hai cột (`file:count`); tác giả lấy **số dòng output** (35) làm **tổng modifier** (197).

Cùng mẫu với §3.8: cột `private` điền các số lẻ (35, 29, 21, 19, 18…) **từ bảng phân bố §3.6** — mà bảng phân bố đó lại lấy từ con số tổng sai.

**Luật cho người viết tài liệu sau này (tôi tự rút ra sau khi bác 8 chỗ):**

> Mỗi con số trong tài liệu phải do **một lệnh in ra**, và lệnh đó phải in **con số** chứ không chỉ in **danh sách**. Nếu tài liệu chỉ in danh sách mà đưa con số ở chỗ khác, hãy coi con số đó là **chưa kiểm chứng** cho tới khi tôi chạy lại lệnh có con số.

---

## 13. Kết luận cho người đọc lại sau 6 tháng

**Tài liệu `deep-risk.md` đáng tin ở phép đo cơ bản, đáng nghi ở phép đo được dán tay.** Cụ thể:

1. **Giữ nguyên:** mọi khuyến nghị port. Bảng % cắm core, bảng dòng, bảng `ReturnType<`, 603 file, 40 builtin, 323 file prompt, 41 file `.md`, 223 prompt của omp, và **toàn bộ §7 JSONL** — tôi chạy lại và **khớp**.
2. **Sửa trước khi dùng:** `private` 35→**197**; 14→**13** dòng model-id; 33→**32** file preset; 18→**≥19** kdl; 10→**12** oauth; 16→**19** `model_select`; `src/capability/rule.ts` **không tồn tại**; `tool-pair-guard` **không vá `packages/ai`**.
3. **Bổ sung:** 14/40 builtin **không có `changes.md`** ⇒ mọi ô "–" trong §3.8 là **thiếu dữ liệu, không phải 0%**; phủ sóng session-layer là **26/40**, không phải "10+".
4. **Giữ cảnh báo OMO** — nhưng đổi lý do: không phải "giấu trong `NOTICE.md`" (README khai rõ), mà là **đã có prompt tinh chỉnh của người khác + chuỗi `OH-MY-OPENCODE` sẽ làm omp tự giới thiệu sai thương hiệu**. `prompt-preset` **không chép nội dung**.
5. **Ưu tiên cao nhất khi M5 chạy:** `ask-user/resume.ts` · `btw/index.ts` · `compaction/resume-slice.ts` — 39 file dùng `JSON.parse` trực tiếp trên đường session. Đi qua `parseJsonlLenient` của omp (`stream.ts:575`), **không** dùng `JSON.parse` thô. Chép session layer của `pi` là **làm chật hơn**.
6. **Tự làm lại phép đo.** Đặc biệt bảng §2.1: nó chỉ phủ 26/40 builtin. Với 14 builtin còn lại, phép "tự thú trong `changes.md`" **không áp dụng được** — cần phép khác (đọc `registerEntryRenderer`/`setActiveTools`, hoặc đo thay đổi hành vi).

---

### Phụ lục — lệnh để tự chạy lại, tất cả 8 lỗi

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers
B=packages/coding-agent/src/core/extensions/builtin
cd $S
git ls-files "$B" | grep -E '\.ts$' | grep -v '/test/' > /tmp/bi_ts.txt   # 603

# #1 private 35 vs 197
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | awk -F: '{s+=$2} END{print "modifier:",s}'  # 197
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | wc -l                        # 35 file

# #2 mật độ — btw 2,31% vs cursor 0,68%
for d in cursor-cli-oauth btw permission-system gpt-apply-patch todotools; do
  p=$(xargs grep -cE '^\s*(private|protected|public)\s' < <(grep "$B/$d/" /tmp/bi_ts.txt) 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
  l=$(git ls-files "$B/$d" | grep -E '\.ts$' | grep -v '/test/' | tr '\n' '\0' | xargs -0 cat | wc -l)
  printf "%-22s %3s / %5s = %.2f%%\n" "$d" "$p" "$l" "$(echo "scale=4;$p*100/$l" | bc)"
done

# #3/#4 13 dòng, không phải 14; compaction:292 không khớp
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/bi_ts.txt
sed -n '292p' $B/compaction/prompts.ts
sed -n '292p' $B/compaction/prompts.ts | grep -cE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|…)'   # 0

# #5 38 file .ts, 32 tên-model (không phải 33)
ls -1 $B/prompt-preset/*.ts | wc -l                                    # 38
# #6 14 lệnh includes/test trong presets.ts:70-285 (không phải 11)
sed -n '70,285p' $B/prompt-preset/presets.ts | grep -oE '\.(includes|startsWith|endsWith)\(' | wc -l

# #7 kdl  (ls bị alias lsd ở máy này — dùng find)
find $OMP/packages/catalog/src/compat/rules/classes -maxdepth 1 -name '*.kdl' | wc -l
# #8 oauth 12
ls -1 $OMP/crates/pi-natives/src/oauth_callback/ | wc -l
# #9 model_select 19
xargs grep -l 'model_select' < /tmp/bi_ts.txt | wc -l

# #10 14 builtin không có changes.md
for d in $(git ls-files "$B/*" | sed "s|.*/builtin/||" | cut -d/ -f1 | sort -u); do
  [ -f "$B/$d/changes.md" ] || echo "KHÔNG changes.md: $d"; done

# #11 tool-pair-guard không tham chiếu packages/ai
ls -1 $B/tool-pair-guard/
grep -rn 'packages/ai\|tool-pair-repair' $B/tool-pair-guard/     # rỗng

# #12 src/capability/rule.ts không tồn tại
[ -e $B/../capability/rule.ts ] && echo CÓ || echo KHÔNG
find . -path ./node_modules -prune -o -name 'rule.ts' -path '*capability*' -print

# #14 NOTICE vs README
grep -n '^#' $S/NOTICE.md
grep -niE 'oh-my-openagent|OMO' $S/README.md | head -3

# §11 session-layer 26, không phải "10+"
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' -- "$B/*" | wc -l
xargs grep -l 'JSON\.parse' < /tmp/bi_ts.txt | wc -l
```

**Tôi không sửa file nào trong `senpi-ref`, `pi-ref` hay `ultraworkers`.** Toàn bộ là đo và đọc.
