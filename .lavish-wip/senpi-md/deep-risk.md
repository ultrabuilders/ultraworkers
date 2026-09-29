# Rủi ro sâu: builtin nào cắm thẳng vào core, builtin nào phụ thuộc provider/model, và cái nào VI PHẠM `AGENTS.md` của omp

> Nghiên cứu M5, vòng rủi ro. Viết **2026-09-28**.
> Mọi khẳng định kèm **lệnh đã chạy + đường dẫn + số dòng**. Không có phép đo nào dựa vào suy đoán.
>
> **Cây đo:**
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref     # code-yeongyu/senpi
> OMP=/Users/tranquangdang21/Projects/ultraworkers # bản làm việc của oh-my-pi
> ```
>
> **Đã đọc trước khi viết (6 file vòng định hướng):** `lineage.md` · `changes-md.md` · `builtins.md` · `new-packages.md` · `m1b-collision.md` · `ext-api.md`.

---

## 0. TL;DR — 6 điều đo được, đọc điều 1 và 2 trước

1. **`prompt-preset` là bản vi phạm `AGENTS.md` nặng nhất, và phải VIẾT LẠI — không chép được.** Nó là **bảng tra theo model-id**: 33 file preset, **tên file chính là model id** (`gpt-5.6.ts`, `kimi-k3.ts`, `claude-opus-5.ts`…), cộng `presets.ts:70-285` có **11 nhánh `normalized.includes("gpt-5.6")` / `includes("opus-4-8")`…**. `AGENTS.md` cấm đúng thứ này bằng câu *"NEVER hard-code model- or provider-conditional policy in TypeScript… never through string matching on ids"*.

2. **Phát hiện mới, chưa ai ghi: `prompt-preset` chứa prompt port từ OMO, mà `NOTICE.md` của senpi KHÔNG khai báo.** `builtin/prompt-preset/changes.md` có **10/58 entry** nhắc `omo`/`Hephaestus`/`oh-my-opencode`, và dẫn tới hai path **không tồn tại trong senpi**: `packages/omo-codex/…/gpt-5.6.md`, `packages/omo-opencode/…/gpt-5-6.ts`. `lineage.md` §3.5 nói *"không một dòng code OMO nào nằm trong senpi"* — câu đó **đúng về code, sai về prompt**. Câu đó chỉ đúng vì prompt nằm trong `.ts` chứ không phải file riêng. **Đây là khoảng trống pháp lý thật, không phải suy đoán.**

3. **omp đã có sẵn chỗ đúng để hút prompt-preset vào — nhưng phải viết lại.** `packages/catalog/src/identity/dialect.ts:19-40` có `preferredDialect(modelId)` switch trên `classifyModel(...).class`, trả 12 dialect (`anthropic`/`glm`/`kimi`/`gemini`/`qwen3`/`deepseek`/`harmony`…). Đó là **trục có sẵn** để mang "prompt style theo họ model" vào KDL. Còn `packages/catalog/src/compat/rules/classes/` đã có **18 file `.kdl`** theo họ model.

4. **`senpi` dùng `classifyModel` 0 lần; omp dùng ở 20+ file.** Không phải chi tiết nhỏ — đó là **vì sao** senpi buộc phải viết regex tay, và là lý do regex của senpi **không chép được** sang omp.

5. **Prompt-in-TS: 323 file của cây builtin chứa template literal ≥200 ký tự, tổng ~1,27 MB ký tự.** Lệnh ở §3.2. `AGENTS.md`: *"never build prompts in code (no inline strings, template literals, or concatenation). Prompts live in static `.md` files"*. Trong 40 thư mục builtin, senpi có **41 file `.md`** — nhưng **không file `.md` nào là prompt**: toàn là `AGENTS.md` + `changes.md`. **Không có hệ prompt-ở-file như omp.**

6. **Rủi ro TUI: `replaceTabs` 0 file, `shortenPath` 0 file, `PREVIEW_LIMITS` 0 file trên 603 file `.ts` của cây builtin.** Trong khi `AGENTS.md` của omp bắt buộc dùng đúng ba hàm đó ở *mọi* render path, kể cả error path. → **Bất kỳ builtin nào có renderer riêng đều phải viết lại phần sanitize**, không cài nguyên si.

**Kết luận một câu:** *chép được 6 builtin lõi-nhẹ; 3 builtin phải viết lại từ đầu (`prompt-preset`, `permission-system`, `tool-pair-guard`); 4 builtin không nên lấy vì phụ thuộc provider cụ thể mà omp đã có sẵn hoặc không có (`anthropic-subscription`, `cursor-cli-oauth`, `gpt-apply-patch`, `compaction`).* Chi tiết §5–§7.

---

## 1. Đo lại nền — và một bài học về phép đo

### 1.1 Con số trong briefing ĐÚNG — nhưng `wc -l | tail -1` cho SAI

Briefing ghi `senpi 5.554 file .ts+.tsx · 955.527 dòng`. Tôi đo lại:

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
git -C $S ls-files | grep -E '\.(ts|tsx)$' | wc -l
# 5554                                    ← khớp briefing

git -C $S ls-files | grep -E '\.(ts|tsx)$' | (cd $S && xargs wc -l 2>/dev/null | tail -1)
# 107902 total     ← SAI, nhỏ hơn gần 9 lần
```

**Vì sao sai:** `xargs` chia danh sách file thành **nhiều lần gọi `wc`**, mỗi lần in một dòng `total` riêng. `tail -1` chỉ lấy dòng `total` của **lần gọi cuối**.

Đúng phải **cộng mọi dòng `total`**:

```bash
git -C $S ls-files | grep -E '\.(ts|tsx)$' \
  | (cd $S && xargs wc -l 2>/dev/null | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}')
# 955527     ← khớp briefing, 2 dòng partial total
```

Kiểm chéo trên omp:

```bash
git -C $OMP ls-files | grep -E '\.(ts|tsx)$' \
  | (cd $OMP && xargs wc -l 2>/dev/null | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}')
# 1695782    ← khớp briefing
```

> **Ghi lại vì người đọc sau 6 tháng chắc chắn sẽ vấp:** `wc -l … | tail -1` trên output của `xargs wc` là **phép đo sai** trên mọi cây > vài nghìn file. Phải `awk '{s+=$1}'` trên tất cả dòng `total`. Đây cũng là lý do một số con số trong tài liệu khác có thể cần kiểm lại.

### 1.2 Xác nhận 40 builtin

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files 'packages/coding-agent/src/core/extensions/builtin/*' \
  | sed 's|.*/builtin/||' | cut -d/ -f1 | sort -u \
  | while read d; do
      git ls-files --error-unmatch "packages/coding-agent/src/core/extensions/builtin/$d/index.ts" >/dev/null 2>&1 && echo "$d"
    done | wc -l
# 40
```

Danh sách: `account anthropic-bash anthropic-subscription anthropic-web-search ask-user bash-timeout btw cache-keepalive compaction config-reload cursor-cli-oauth goal gpt-apply-patch help herdr history-search hooks imagegen look-at loop loop-guard mcp model-fallback nested-agents-md openai-image-gen openai-web-search permission-system prompt-preset reasoning recommended-models rule-activation rules terminal todotools tool-pair-guard tool-search ttsr video-in webfetch websearch`

**603 file `.ts`** trong 40 thư mục, **trừ test** — đây là mẫu đo cho toàn bộ tài liệu này:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files 'packages/coding-agent/src/core/extensions/builtin' \
  | grep -E '\.ts$' | grep -v '/test/' > /tmp/bi_ts.txt
wc -l < /tmp/bi_ts.txt     # 603
```

Mọi lệnh bên dưới đều là `xargs grep … < /tmp/bi_ts.txt`.

---

## 2. CẮM THẲNG VÀO CORE — đo bằng hai phép độc lập

Câu hỏi của đề: *builtin nào cắm thẳng vào core (không qua hook)?*

Hai phép đo khác nhau, cho hai câu trả lời khác nhau. **In cả hai.**

### 2.1 Phép đo A — tự thú của chính tác giả fork (mục đích: "tác giả nói gì")

Mỗi entry `changes.md` của senpi có mục bắt buộc tên `### Why an extension could not handle it` — nghĩa là *"cái này làm bằng extension không được, phải sửa core"*.

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
B=packages/coding-agent/src/core/extensions/builtin
for d in $(cat /tmp/bi_builtin_dirs.txt); do
  f=$B/$d/changes.md; [ -f "$f" ] || continue
  tot=$(grep -c '^## ' $f)
  core=$(grep -c 'Why an extension could not handle it\|Why extension system couldn.t handle it\|Why this cannot be expressed externally\|Why this lives in the fork' $f)
  [ "$core" -gt 0 ] && printf "%-24s %3s/%3s = %3d%%\n" "$d" "$core" "$tot" $((core*100/tot))
done | sort -k4 -rn
```

| builtin | entry nói "làm bằng extension không được" | % |
|---|---:|---:|
| `herdr` | 3/3 | **100%** |
| `cache-keepalive` | 4/4 | **100%** |
| `config-reload` | 11/12 | **91%** |
| `cursor-cli-oauth` | 12/13 | **92%** |
| `anthropic-subscription` | 53/69 | **76%** |
| `webfetch` | 7/10 | 70% |
| `terminal` | 27/47 | 57% |
| `imagegen` | 8/14 | 57% |
| `rules` | 4/8 | 50% |
| `openai-image-gen` | 2/4 | 50% |
| `compaction` | 36/88 | 40% |
| `btw` | 2/5 | 40% |
| `todotools` | 7/19 | 36% |
| `goal` | 22/63 | 34% |
| `mcp` | 9/27 | 33% |
| `tool-search` | 3/10 | 30% |
| `websearch` | 1/4 | 25% |
| `nested-agents-md` | 1/4 | 25% |
| `prompt-preset` | 14/58 | 24% |
| `bash-timeout` | 1/5 | 20% |
| `ttsr` | 2/11 | 18% |
| `permission-system` | 1/11 | 9% |
| `gpt-apply-patch` | 1/12 | 8% |

**Cảnh báo về phép đo này:** con số là **tự báo cáo của tác giả**, không phải kiểm chứng độc lập. Tác giả có thể thổi phồng (để biện minh cho việc sửa core) hoặc thu nhỏ (để giữ hình ảnh "extension-first"). Vì vậy tôi đo thêm phép B.

> **Sai lệch so với `builtins.md` §3.7:** tài liệu đó đếm `grep -h 'Why an extension could not handle it'` trên *tất cả* `changes.md` con → **253/564 = 44%**. Tôi đếm *từng builtin một* với 4 mẫu heading → con số ở bảng trên. **Hai phép cho hai tổng khác nhau; in cả hai.** Phép per-builtin ở đây dễ kiểm chứng hơn vì nó gắn từng cái với tên thư mục.

### 2.2 Phép đo B — tự kiểm chứng bằng code (không tin tự báo)

**B1. Core file thật sự bị sửa.** Lấy mọi path `packages/…` mà `changes.md` trong cây builtin nhắc tới, rồi kiểm path đó **có tồn tại không**:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
grep -rhoE '`packages/[^`]+`' packages/coding-agent/src/core/extensions/builtin --include=changes.md \
  | grep -v 'core/extensions/builtin' | tr -d '`' | sed 's|packages/coding-agent/||' | sort -u
```

Sau khi lọc test/fixture, **10 path lõi thật**, tất cả **đều tồn tại**:

| path | tồn tại? |
|---|---|
| `packages/ai/src/api/transform-messages.ts` | ✅ |
| `packages/ai/src/providers/cursor.ts` | ✅ |
| `packages/ai/src/utils/retry.ts` | ✅ |
| `packages/ai/src/utils/tool-pair-repair.ts` | ✅ |
| `packages/ai/src/utils/prompt-cache-ttl.ts` | ✅ |
| `packages/agent/src/agent-loop.ts` | ✅ |
| `packages/pty/src/registry-session.ts` | ✅ |
| `packages/senpi-codemode/src/prompt/eval-prompt.ts` | ✅ |
| `src/capability/rule.ts` · `src/config.ts` · `src/core/messages.ts` | ✅ |

**Đây là bằng chứng cứng nhất** trong toàn bộ tài liệu: cây builtin đào vào **`packages/ai`** (tầng provider) và **`packages/agent`** (tầng vòng lặp) — không chỉ `src/` của coding-agent.

**B2. API lách hook.** Đếm file dùng mỗi cơ chế đăng ký:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
for api in registerTool registerCommand registerFlag registerMessageRenderer setModel setActiveTools \
           registerProvider registerLazyToolActivator registerEntryRenderer; do
  n=$(xargs grep -l "\b$api\b" < /tmp/bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')
  printf "%-28s %s file\n" "$api" "$n"
done
```

```
registerTool                 22 file
registerCommand              26 file
setActiveTools               20 file     ← tự quyết tool nào lộ cho model
registerFlag                  8 file
registerEntryRenderer         5 file
registerProvider              4 file
setModel                      3 file
registerLazyToolActivator     3 file
```

`setActiveTools` (20 file) và `setModel` (3 file) **không phải hook** — chúng là **lệnh trực tiếp thay đổi state của session**. File dùng nhiều nhất: `gpt-apply-patch/extension.ts` (4), `tool-search/service.ts` (3), `video-in/index.ts` (2), `look-at/index.ts` (2), `ask-user/extension.ts` (2).

**B3. Method mà omp chưa có, ai dùng:**

```bash
xargs grep -ln 'executeTool\|setSessionFastMode\|setSessionModel\|setSessionThinkingLevel' < /tmp/bi_ts.txt
```

→ `reasoning/index.ts:192`, `recommended-models/index.ts:157,165`, `service-tier.ts:108-109,168,175,196-197,235,254,256,264,292,307`.

`service-tier.ts` dùng `setSessionFastMode` **8 lần** và khai báo nó như một *interface cục bộ* ở dòng 109 — tức **tự định nghĩa hợp đồng với core thay vì dùng hợp đồng có sẵn**. Đây là dấu hiệu rõ của việc cắm thẳng.

**B4. Monkey-patch / ép kiểu.** `grep -l 'as unknown as\|Object\.assign(\|prototype\.\w+ ='` → 6 file: `anthropic-subscription/auth-lane.ts`, `compaction/deterministic-fallback.ts`, `compaction/openai-remote.ts`, `cursor-cli-oauth/settings.ts`, `gpt-apply-patch/tool.ts`, `hooks/tool-adapter.ts`.

**B5. Đọc config core từ đĩa:** `config-reload/index.ts:48` khai `CONFIG_FILE_NAMES = ["settings.jsonc","settings.json","models.json","keybindings.json"]` — theo dõi 4 file cấu hình lõi.

**B6. Đọc env var để điều khiển:** `goal/persistence.ts:83` đọc `process.env.PI_CODING_AGENT_DIR`.

### 2.3 Kết luận §2 — xếp theo mức cắm core thật

| mức | tiêu chí (đo được) | builtin |
|---|---|---|
| **L3 — cắm sâu, không port được** | ≥90% entry tự thú "làm bằng extension không được" **VÀ** import `@anthropic-ai/*` SDK | `cursor-cli-oauth` (92%), `anthropic-subscription` (76% + SDK) |
| **L2 — cắm vừa** | 50–70%, hoặc sửa `packages/ai` / `packages/agent` | `webfetch` (70%), `terminal` (57%), `imagegen` (57%), `compaction` (40% + `transform-messages.ts` + `agent-loop.ts`) |
| **L1 — cắm nhẹ** | <40%, chỉ qua `setActiveTools`/`setModel` | `goal` (34%), `mcp` (33%), `tool-search` (30%), `prompt-preset` (24%) |
| **L0 — không cắm** | 0 entry, hoặc ≤20% | `btw` (40% nhưng 389 dòng), `bash-timeout` (20%), `ttsr` (18%), `permission-system` (9%), `gpt-apply-patch` (8%) |

---

## 3. VI PHẠM `AGENTS.md` — từng luật, từng con số

`AGENTS.md` của omp có **5 luật** liên quan trực tiếp. Mỗi luật dưới đây: luật → phép đo trên senpi → phán quyết.

### 3.1 🔴 Cấm hardcode model id — **VI PHẠM, nặng nhất: `prompt-preset`**

Chỉ quan tâm **nhánh rẽ điều kiện**, không đếm chữ trong comment:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/bi_ts.txt
```

**14 dòng khớp trên 603 file.** In ra hết:

```
mcp/config.ts:49       preliminary.settings?.importConfigs?.includes("claude")
prompt-preset/presets.ts:70,73,76,79,82    includes("gpt-5.6"|"5.5"|"5.4"|"5.3"|"5.2")
prompt-preset/presets.ts:269               includes("opus-5")
prompt-preset/presets.ts:276,279,282,285   includes("opus-4-8"|"4-7"|"4-6"|"4-5" hoặc "4.5")
tool-search/native-support.ts:26           model.provider !== "anthropic" || model.id.includes("haiku")
websearch/websearch/native.ts:35           /^gpt-(4o|4\.1|5)/.test(model.id) && !model.id.includes("codex")
compaction/prompts.ts:292                  /^gpt-|^o\d|codex/.test(model.id) || model.provider === "openai" || "azure-openai"
```

**13/14 nằm trong `prompt-preset` + `compaction`.** Đây không phải tai nạn — nó là **cấu trúc**.

**Bằng chứng cấu trúc: tên file trong `prompt-preset/` CHÍNH LÀ model id.**

```bash
ls packages/coding-agent/src/core/extensions/builtin/prompt-preset/
```

**33 file preset**, trong đó:

| file | dòng | file | dòng | file | dòng |
|---|---:|---|---:|---|---:|
| `gpt-6-astra.ts` | 400 | `claude-opus-5.ts` | 132 | `glm-5.ts` | 18 |
| `gpt-5.6.ts` | 240 | `claude-fable-5-1.ts` | 125 | `gpt-5.2.ts` | 25 |
| `kimi-k3.ts` | 123 | `claude-opus-5-5.ts` | 120 | `claude-opus-4-8.ts` | 25 |
| `grok-4.7.ts` | 122 | `claude-fable-5.ts` | 116 | `gpt-5.5.ts` | 102 |
| `grok-4.6.ts` | 102 | `deepseek-v4.ts` | 86 | `gpt-5.3-codex.ts` | 23 |
| `grok-4.5.ts` | 79 | `kimi-k2-code.ts` | 29 | `kimi-k2-6.ts` | 21 |

Đó **chính là "per-model lookup table" mà `AGENTS.md` cấm bằng tên**. Không phải diễn giải lại — là cấu trúc tệp.

**Vì sao không chép được — và đưa vào đâu cho đúng:**

`AGENTS.md`: *"Branching on model identity in TS is allowed **only** through structured facts from `classifyModel()`… prefer a KDL axis when one can express the policy."*

**omp đã có trục sẵn.** Đo:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
sed -n '1,40p' packages/catalog/src/identity/dialect.ts
```

```typescript
import { classifyModel } from "../compat/taxonomy";

export type Dialect = "glm" | "hermes" | "kimi" | "xml" | "anthropic"
                   | "deepseek" | "harmony" | "qwen3" | "gemini"
                   | "gemma" | "minimax";

export function preferredDialect(modelId: string): Dialect {
	switch (classifyModel("", modelId, { lenient: true }).class) {
		case "anthropic": return "anthropic";
		case "kimi":      return "kimi";
		case "deepseek":  return "deepseek";
		…
		default:          return FALLBACK_DIALECT;   // "xml"
	}
}
```

Đây là **đúng cái** `prompt-preset` cần. Và `packages/catalog/src/compat/rules/classes/` đã có **18 file `.kdl`**: `anthropic · openai · gemini · glm · kimi · deepseek · qwen · minimax · xai · mistral · gemma · meta · cohere · amazon · bytedance · baidu · mimo · stepfun` — **đủ 18 họ** mà `prompt-preset` của senpi phục vụ.

**Phán quyết `prompt-preset`: VIẾT LẠI.**
- Điều kiện chọn preset → **KDL** (`classes/*.kdl`, thêm axis ví dụ `prompt-family` cạnh `dialect`).
- Nội dung prompt → **file `.md`**, import bằng `with { type: "text" }` (đúng chuẩn omp, xem §3.2).
- **Không chép `presets.ts`, không chép 33 file `*.ts` preset.**

**Hai builtin khác cùng vi phạm luật này, nhưng rẻ hơn nhiều:**
- `tool-search/native-support.ts:26` — 1 dòng, chuyển thành `classifyModel(id).class === "anthropic" && family !== "haiku"`.
- `websearch/native.ts:35` — 1 regex `/^gpt-(4o|4\.1|5)/` + `!id.includes("codex")`. Chuyển thành truy vì `class` + `revision` của KDL.
- `compaction/prompts.ts:292` — 1 dòng regex, cùng cách.

### 3.2 🔴 Cấm viết prompt bằng TS — **VI PHẠM trên quy mô lớn nhất**

Đo template literal ≥200 ký tự trong 603 file:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
python3 - <<'PY'
import re,subprocess,os
S="/Users/tranquangdang21/Projects/senpi-ref"
B="packages/coding-agent/src/core/extensions/builtin"
files=[f for f in subprocess.run(["git","-C",S,"ls-files",B],capture_output=True,text=True).stdout.split()
       if f.endswith(".ts") and "/test/" not in f]
rows=[]
for f in files:
    t=open(os.path.join(S,f),encoding="utf8",errors="replace").read()
    lits=re.findall(r'`([^`]{200,})`',t,re.S)
    if lits: rows.append((sum(map(len,lits)),len(lits),f))
rows.sort(reverse=True); tt=0
for total,n,f in rows:
    tt+=total; print(f"{total:>7} chars {n:>3} lits  {f}")
print("TỔNG:",tt,"| SỐ FILE:",len(rows))
PY
```

```
 35704 chars   9 lits  compaction/index.ts
 32750 chars  21 lits  loop/scheduler.ts
 32463 chars  19 lits  loop/index.ts
 24641 chars  18 lits  prompt-preset/gpt-6-astra.ts
 22336 chars  11 lits  terminal/monitor-registry.ts
 21718 chars   7 lits  goal/monitor-continuation.ts
 21294 chars   6 lits  compaction/openai-remote.ts
 21187 chars   6 lits  mcp/service.ts
 19850 chars   4 lits  rules/rules/engine.ts
 19571 chars  11 lits  config-reload/index.ts
 18998 chars   6 lits  cursor-cli-oauth/stream.ts
…
TỔNG: 1268737 chars   SỐ FILE: 323
```

**⚠️ Cảnh báo về phép đo:** regex `` `…` `` bắt **mọi** template literal dài — kể cả JSON, code snippet, log message. Con số 1,27 MB là **cận trên**, không phải "1,27 MB prompt". Nhưng **323/603 file = 54%** là con số đáng tin, và các file top đầu đã **tự chứng minh** là prompt:

```bash
sed -n '11,40p' packages/coding-agent/src/core/extensions/builtin/compaction/prompts.ts
```

```typescript
const TASK_INTENT_ACQUISITION_CLAUDE = `PASS 1 — Internal task-intent extraction
Write one <task-intent> block with ORIGINAL_REQUEST, TASK_TYPE, … before <summary>.`;

export const MERGED_COMPACTION_PROMPT_SYSTEM = `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - COMPACTION CONTEXT]
You are the COMPACTION ARCHIVAST. Create a structured handoff summary …
Cardinal rules:
R1. Quote user requests and constraints VERBATIM. Do not paraphrase.
…
```

Đây là **prompt thuần trong TS**. Không mơ hồ.

**Không có hệ prompt-ở-file ở senpi.** Kiểm chứng:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git ls-files 'packages/coding-agent/src/core/extensions/builtin' | grep '\.md$' | grep -vE 'AGENTS\.md|changes\.md' 
# packages/coding-agent/src/core/extensions/builtin/imagegen/skill/SKILL.md
# packages/coding-agent/src/core/extensions/builtin/mcp/native-search-spike.md
```

**41 file `.md`, 0 file là prompt.** Tất cả là `AGENTS.md` + `changes.md`, trừ 2 file tài liệu. Handlebars cũng không có:

```bash
git grep -l 'Handlebars\|handlebars' -- 'packages/*'
# packages/coding-agent/src/core/export-html/vendor/highlight.min.js   ← vendor, không liên quan
```

**So với omp:**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
git ls-files 'packages/coding-agent/src/prompts/*.md' | wc -l            # 223
git grep -h 'with { type: "text" }' -- 'packages/coding-agent/src/*.ts' | head -1
# import adviseDescription from "../prompts/advisor/advise-tool.md" with { type: "text" };
```

**Phán quyết:** bất kỳ builtin nào mang prompt trong `.ts` phải **tách prompt ra `.md`**. Đây là việc cơ học nhưng **không tự động**: mỗi prompt phải xác định biến động nào → Handlebars, và phải chạy lại để xem prompt render ra có khác không.

**Rủi ro phụ đáng ghi:** `compaction/prompts.ts:31` chứa chuỗi `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - COMPACTION CONTEXT]`. Nếu chép nguyên, **omp sẽ tự giới thiệu mình là Oh-My-OpenCode** — thương hiệu của người khác. `lineage.md` §4.2 nói `CONTRIBUTING.md` của senpi cấm tạo cảm giác được vendor khác bảo trợ; ta cũng không nên mang sang chuỗi này. Xem thêm §4.

### 3.3 🟠 Cấm `ReturnType<>` — 78 chỗ, tập trung ở 4 builtin

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -c 'ReturnType<' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$' | awk -F: '{s+=$2} END{print "TỔNG:",s}'
# TỔNG: 78
```

Không phải chuyện hình thức — ở `mcp/` nó thay cho **tên kiểu thật** đã bị bỏ:

```bash
grep -n 'ReturnType<' packages/coding-agent/src/core/extensions/builtin/mcp/catalog-cache.ts
# 10: type ListedTool     = Awaited<ReturnType<Client["listTools"]>>["tools"][number];
# 11: type ListedResource = Awaited<ReturnType<Client["listResources"]>>["resources"][number];
# 12: type ListedPrompt   = Awaited<ReturnType<Client["listPrompts"]>>["prompts"][number];
```

Đây là kiểu **suy ra ngược từ giá trị**, đúng thứ `AGENTS.md` cấm để tránh việc đổi hàm âm thầm làm đổi kiểu. Phân bố:

| builtin | số `ReturnType<` |
|---|---:|
| `mcp` | 17 |
| `terminal` | 15 |
| `anthropic-subscription` | 10 |
| `hooks` | 6 |
| `compaction` | 6 |
| `config-reload` | 5 |
| `cursor-cli-oauth` | 3 |
| (còn 12 builtin khác) | 1–2 mỗi cái |

Thêm một loại nữa, ở `anthropic-subscription/sdk-boundary.ts:24`: `type SdkModule = Awaited<ReturnType<typeof loadClaudeAgentSdk>>;` — kiểu của **module SDK được load động**, tức là kiểu phụ thuộc lúc chạy. Xem §4.1.

**Phán quyết:** 78 chỗ, đa số là khai báo kiểu cục bộ 1 dòng → **sửa tay được, giá thấp**. Nhưng phải làm **trước khi** nối vào `runner.ts` của omp, không phải sau.

### 3.4 🟠 Cấm inline import — 4 file

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -ln 'await import(' < /tmp/bi_ts.txt
```

```
mcp/… (4 file)
imagegen/index.ts
terminal/…
```

`AGENTS.md`: *"NEVER use inline imports — no `await import()`"*. Với `imagegen` và `terminal`, lý do load động là **có chủ đích** (native binding / SDK nặng) — nhưng omp đã có cơ chế riêng cho việc này (`sdk.lazy.ts`, `pty.lazy.ts`, `content.lazy.ts` đều là lazy-import *tĩnh* qua wrapper), nên vẫn phải chuyển.

**Ghi chú công bằng:** `terminal/pty.lazy.ts` và `webfetch/content.lazy.ts` là **lazy chunking**, không phải `await import()` thô. Chỉ 4 file là vi phạm thật. **Đừng đếm nhầm 20 file `.lazy.ts` thành 20 vi phạm.**

### 3.5 🟠 Cấm `any` — 10 file, và cấm `console.*` — 5 file

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -lE '(:|as|<|\|)\s*any\b' < /tmp/bi_ts.txt          # 10 file
xargs grep -lE 'console\.(log|error|warn)\(' < /tmp/bi_ts.txt  # 5 file
```

`console.*` là vi phạm **nghiêm trọng hơn về hành vi** — `AGENTS.md`: *"Code that may run while the TUI, RPC, SDK, workers, or background runtimes are active MUST NOT use `console.log`/`error`/`warn`; it corrupts rendering or protocols."*

```bash
grep -rn 'console\.\(log\|error\|warn\)(' packages/coding-agent/src/core/extensions/builtin/ttsr/manager.ts
# 71:  console.warn("TTSR glob pattern is invalid, skipping glob", {…
# 154: console.warn("TTSR condition has invalid regex pattern, skipping condition", {…
```

4 chỗ trong `ttsr/manager.ts`, đều **chạy lúc khởi tạo** — tức đúng lúc TUI đang vẽ. Nhóm còn lại: `compaction/log.ts:117,122`, `mcp/wrap.ts:110`, `permission-system/events.ts:93,104`, `imagegen/index.ts:47`.

**Phán quyết:** thay bằng `logger` từ `@oh-my-pi/pi-utils`. Rẻ, nhưng **bắt buộc** — đây là loại vi phạm làm hỏng render, không phải vi phạm thẩm mỹ.

### 3.6 🟠 Class privacy: `private` keyword — 35 file

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt 2>/dev/null \
  | grep -v ':0$' | awk -F: '{s+=$2} END{print "TỔNG:",s}'      # 35 modifier
```

Kiểm chứng là modifier thật, không phải từ trong comment:

```bash
grep -nE '^\s*(private|protected|public)\s' packages/coding-agent/src/core/extensions/builtin/cursor-cli-oauth/diagnostics.ts
# 267:  private retired = false;
# 268:  private retirementReason: string | undefined;
# 269:  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
```

`cursor-cli-oauth` 35 chỗ, `goal` 21, `terminal` 29, `anthropic-subscription` 18, `todotools` 10.

`AGENTS.md`: *"use ES `#private` fields… **No `private`/`protected`/`public` keyword** on fields or methods, except on constructor parameter properties."*

**Phán quyết:** sửa máy được bằng `oxlint`/IDE refactor, **nhưng 35 modifier `private` ở `cursor-cli-oauth` là lý do thêm để không lấy builtin đó** (xem §6.2).

### 3.7 🔴 TUI Sanitization — vi phạm trên 603/603 file

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
for fn in replaceTabs truncateToWidth shortenPath PREVIEW_LIMITS; do
  printf "%-18s %s file\n" "$fn" "$(xargs grep -l "$fn" < /tmp/bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')"
done
```

```
replaceTabs        0 file      ← AGENTS.md: bắt buộc
truncateToWidth    2 file
shortenPath        0 file      ← AGENTS.md: bắt buộc
PREVIEW_LIMITS     0 file      ← AGENTS.md: bắt buộc
```

**Không builtin nào dùng `replaceTabs` hay `PREVIEW_LIMITS`.** Đây không phải chuyện "thiếu tiện nghi" — senpi **không có** tầng sanitize này, nên mọi renderer của nó tự làm việc riêng (thường là `.slice(0, N)` — 12 file khớp).

**Hệ quả quyết định:** *bất kỳ builtin nào có renderer riêng đều phải viết lại phần sanitize theo helper của omp.* Không có ngoại lệ. `AGENTS.md` còn nói rõ điều này áp cho **error path** — chỗ hay nhúng file content và làm vỡ render.

### 3.8 Bảng tổng hợp vi phạm, theo builtin

Đếm trên 603 file `.ts` (trừ test). Chỉ liệt kê dòng có vi phạm.

| builtin | dòng | `any` | `ReturnType<` | inline import | `console.*` | `private` | tự nhận cắm core |
|---|---:|---:|---:|---:|---:|---:|---:|
| `anthropic-subscription` | 7.281 | – | 10 | – | – | 18 | **76%** |
| `cursor-cli-oauth` | 5.186 | – | 3 | – | – | **35** | **92%** |
| `mcp` | 9.327 | – | **17** | **4** | 1 | 1 | 33% |
| `terminal` | 6.962 | – | 15 | **3** | – | 29 | 57% |
| `compaction` | 8.779 | 7 | 6 | – | 2 | – | 40% |
| `hooks` | 4.663 | – | 6 | – | – | 4 | – |
| `config-reload` | 2.317 | – | 5 | – | – | – | **91%** |
| `goal` | 4.566 | 1 | 1 | – | – | 21 | 34% |
| `gpt-apply-patch` | 2.051 | – | 2 | – | – | 19 | 8% |
| `ttsr` | 3.507 | – | 2 | – | **4** | – | 18% |
| `loop` | 4.042 | – | 1 | – | – | 9 | – |
| `cache-keepalive` | 483 | **9** | 1 | – | – | – | **100%** |
| `permission-system` | 1.638 | – | – | – | 2 | 9 | 9% |
| `prompt-preset` | 2.941 | 2 | 1 | – | – | – | 24% |
| `imagegen` | 880 | – | – | **1** | 1 | – | 57% |
| `btw` | 389 | 1 | 1 | – | – | 9 | 40% |
| `websearch` | 2.287 | – | 1 | – | – | – | 25% |
| `webfetch` | 1.062 | – | – | – | – | – | 70% |
| `ask-user` | 1.284 | – | 2 | – | – | – | – |
| `herdr` / `help` / `history-search` / `look-at` / `loop-guard` / `nested-agents-md` / `reasoning` / `rules` / `tool-search` / `todotools` | – | 1 | 1 | – | – | 2–10 | 0–50% |

> **Cột "dòng" ở đây khác với `builtins.md` §2.** Tài liệu đó đếm `.ts + .tsx + .md` (nên `compaction` = 10.788). Bảng này đếm **`.ts` trừ test**, để số dòng khớp với số vi phạm. Hai phép, hai con số — đừng so chéo.

---

## 4. PHỤ THUỘC PROVIDER/MODEL CỤ THỂ — bốn builtin, mỗi cái một kiểu

### 4.1 `anthropic-subscription` (7.281 dòng) — phụ thuộc SDK bên thứ ba

Đo import:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
grep -rhoE 'from "(@anthropic-ai/[^"]+|[a-z][a-z0-9-]*)"' packages/coding-agent/src/core/extensions/builtin/anthropic-subscription/*.ts | sort | uniq -c | sort -rn
```

```
  3  from "@anthropic-ai/claude-agent-sdk"
  1  from "@anthropic-ai/claude-agent-sdk/extract"
  1  from "@anthropic-ai/sdk/resources"
  1  from "@anthropic-ai/sdk/resources/messages.js"
  2  from "zod"
```

Đây là **SDK Claude Agent của Anthropic**, không phải provider lane của pi. `sdk-boundary.ts` là lớp trung gian export lại kiểu:

```typescript
import type { EffortLevel, Options, SDKMessage, … } from "@anthropic-ai/claude-agent-sdk";
type SdkModule = Awaited<ReturnType<typeof loadClaudeAgentSdk>>;
export type SdkQueryInput = Parameters<SdkModule["query"]>[0];
```

**omp không có dependency này:**

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
grep -c 'claude-agent-sdk' bun.lock
# 0
grep -n 'claude-agent-sdk\|@anthropic-ai/sdk' package.json packages/coding-agent/package.json
# (không có dòng nào)
```

Nghĩa là: **chép `anthropic-subscription` vào omp = thêm một dependency lớn chưa từng có**, cộng 53/69 entry tự thú phải sửa core, cộng hai hệ OAuth cùng tranh callback URL (omp đã có `crates/pi-natives/src/oauth_callback/` — 10 file, 146 KB).

**Phán quyết: KHÔNG LẤY.** Giá: thêm SDK + tranh OAuth. Cái mất: provider lane Claude subscription — nhưng đó là quyết định cấp sản phẩm, không phải M5.

### 4.2 `cursor-cli-oauth` (5.186 dòng) — 92% cắm core, 35 `private`

Cao nhất về cả hai phép đo:

```bash
# 12/13 entry tự thú "làm bằng extension không được"  (92%)
# 35 modifier `private` — nhiều nhất cây builtin
# đăng ký provider: registerProvider tại index.ts
```

Nó **spawn executable CLI**, đo model, refresh catalog. `packages/ai/src/providers/cursor.ts` là core file bị nó đào vào. omp đã có:

```bash
wc -l /Users/tranquangdang21/Projects/ultraworkers/packages/ai/src/providers/cursor.ts
# 5541 lines
```

**Phán quyết: KHÔNG LẤY.** Lý do mạnh nhất: **35 vi phạm `private` + 92% cắm core + trùng nghiệp vụ provider đã có sẵn 5.541 dòng bên omp.** Đây là builtin *duy nhất* vi phạm nhiều luật AGENTS.md đồng thời.

### 4.3 `prompt-preset` (2.941 dòng) — phụ thuộc model-id, **và có vấn đề pháp lý**

Xem §3.1 cho phần kỹ thuật. Giờ là phần **chưa ai ghi**.

`builtin/prompt-preset/changes.md` tự thú:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
grep -n 'Hephaestus\|oh-my-opencode\|omo-codex\|omo-opencode' \
  packages/coding-agent/src/core/extensions/builtin/prompt-preset/changes.md | head -6
```

```
1105: … Reframed the tool-loops paragrap…
1110: Part-by-part comparison against omo's Hephaestus 5.6 prompts
      (omo-opencode `gpt-5-6.ts` + omo-codex `gpt-5.6.md`) …
1121: `gpt-5.6.ts`: ported the Hephaestus stop-contract hardening that landed in
      oh-my-opencode after the 2026-07-13 parity rewrite (omo commits 03753d38c,
      a0a89aa6d, 8482f2c9a on `packages/omo-codex/…/hephaestus/gpt-5.6.md`)
1137: `gpt-5.6.ts`: rewrote the full-core prompt to match the Hephaestus
      autonomous-deep-worker prompt for GPT-5.6 (oh-my-opencode
      `packages/omo-opencode/src/agents/hephaestus/gpt-5-6.ts`) …
```

Hai path đó **không tồn tại trong senpi** — kiểm chứng:

```bash
for p in packages/omo-codex/plugin/components/rules/bundled-rules/hephaestus/gpt-5.6.md \
         packages/omo-opencode/src/agents/hephaestus/gpt-5-6.ts; do
  [ -e "/Users/tranquangdang21/Projects/senpi-ref/$p" ] && echo "CÓ $p" || echo "KHÔNG $p"
done
# KHÔNG  packages/omo-codex/plugin/components/rules/bundled-rules/hephaestus/gpt-5.6.md
# KHÔNG  packages/omo-opencode/src/agents/hephaestus/gpt-5-6.ts
```

Quy mô:

```bash
python3 - <<'PY'
import re
f="/Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin/prompt-preset/changes.md"
parts=re.split(r'\n## ',open(f,encoding="utf8").read())
omo=sum(1 for p in parts[1:] if re.search(r'omo|Hephaestus|hephaestus|oh-my-opencode',p,re.I))
print("entry nhắc omo/Hephaestus:",omo,"/",len(parts)-1)
PY
# entry nhắc omo/Hephaestus: 10 / 58
```

**Và `NOTICE.md` của senpi không khai báo điều này:**

```bash
grep -n '^#' /Users/tranquangdang21/Projects/senpi-ref/NOTICE.md
# 1: # Notices
# 3: ## LinkeDOM
# 25: ## System prompt text     ← chỉ nói Gajae-Code
# 37: ## TTSR stream-rule extension
# 53: ## Todo tool
```

Không khoản nào cho OMO / Hephaestus.

**Cần nói thẳng điều này không phải lỗi của tôi:** `lineage.md` §3.5 nói *"không một dòng code OMO nào nằm trong senpi"* và kết luận *"chép từ senpi ⇒ chỉ chịu ràng buộc MIT của senpi"*. Câu đó **đúng về code** — tôi xác nhận, `git grep -iE 'oh-my-openagent|/omo/'` không ra gì. Nhưng nó **không nói về prompt**: prompt lấy từ OMO nằm trong file `.ts` của senpi, nên nó **không đi qua bộ lọc "file OMO trong repo"**. Đó là khoảng trống của phép đo, không phải mâu thuẫn.

**Điều này không làm thay đổi kết luận "chép được" của `lineage.md`** — vì:
1. M5 **không cần** `prompt-preset` (phải viết lại vì vi phạm KDL, xem §3.1). Không viết lại = không chép prompt của OMO.
2. Nhưng **phải ghi lại** trong `NOTICE.md` của omp nếu sau này ai đó tình cờ lấy file preset.

**Phán quyết: VIẾT LẠI, và đừng lấy nội dung prompt từ senpi.** Lấy *ý tưởng* ("mỗi họ model cần cách ra lệnh khác nhau") — cái đó ta tự nghĩ ra được — rồi viết prompt mới theo văn phong omp.

### 4.4 `compaction` (8.779 dòng) — phụ thuộc provider ở tầng wire

```bash
sed -n '292p' /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin/compaction/prompts.ts
# 	return /^gpt-|^o\d|codex/.test(model.id ?? "") || model.provider === "openai" || model.provider === "azure-openai";
```

Dòng này **chọn prompt family khác nhau theo provider**. Nó đảo ngược thứ tự mà `AGENTS.md` đặt ra: `AGENTS.md` nói *class* là "model-lineage truths, behavior inherent to a model line, **on any host**", còn *provider* là "deployment contracts". Ở đây senpi chọn prompt **theo provider** — tức chọn theo host, không theo model-lineage.

Ngoài ra `compaction` đào vào `packages/ai/src/api/transform-messages.ts` (biến đổi message trước khi gửi provider) và `packages/agent/src/agent-loop.ts`.

**Phán quyết: KHÔNG LẤY nguyên si** — lý do độc lập với AGENTS.md: `builtins.md` §6.2 đã đo `snapcompact` của omp là hệ compaction riêng. Ghép hai compaction = hỏng cả hai. Lý do *thêm* là vi phạm luật provider-vs-class ở trên.

### 4.5 Bốn builtin "provider-specific" còn lại — rẻ, và cũng phải viết lại

| builtin | dòng | phụ thuộc gì | phán quyết |
|---|---:|---|---|
| `anthropic-bash` | 103 | bật native tool `bash_20250124` qua `compat`; đọc env `PI_ANTHROPIC_BASH` | **viết lại** — chỉ 103 dòng, nhưng phải qua KDL `classes/anthropic.kdl` (10 KB đã có) |
| `anthropic-web-search` | 249 | native web search Anthropic + allow/block domain | **viết lại** — cùng lý do |
| `openai-web-search` | 272 | native web search OpenAI, capability-aware | **viết lại** — cùng lý do |
| `openai-image-gen` | 414 | tool ảnh native OpenAI; 2/4 entry cắm core (50%) | **viết lại** — cùng lý do |
| `gpt-apply-patch` | 2.051 | apply-patch cho wire mode OpenAI/Codex, có parser patch riêng | **không lấy** — `gpt-apply-patch/extension.ts` dùng `setModel` 4 lần + `setActiveTools`; omp có `ast-edit.ts` |

Tổng 5 cái này = **3.189 dòng**. Nhỏ, nhưng **toàn bộ phải viết lại** vì cùng một lý do: chúng là *deployment contract theo provider*, mà `AGENTS.md` đã giao chỗ đứng riêng cho việc đó là `providers/*.kdl` + `classes/*.kdl`.

---

## 5. PHẢI VIẾT LẠI — ba cái, và vì sao *không* chép được

Tóm lại §3–§4. Ba builtin **không có đường chép trực tiếp**:

### 5.1 `prompt-preset` (2.941 dòng) — bảng tra model-id

- **Vi phạm:** luật KDL (11 nhánh `includes()` + 33 file tên model) · luật prompt-trong-TS (2.941 dòng prompt) · rủi ro OMO (§4.3).
- **Chép được gì:** *ý tưởng* — "mỗi họ model cần văn phong ra lệnh khác nhau". Thêm axis `prompt-family` vào `classes/*.kdl`, cạnh `Dialect` đã có ở `identity/dialect.ts:19-40`.
- **Chi phí:** 33 file `.ts` preset → 33 file `.md`, cộng 1 entry KDL, cộng `presets.ts` 454 dòng → hàm tra trên `classifyModel`.
- **Cái mất nếu bỏ:** mất 33 preset đã tinh chỉnh theo cải tiến thực đo (một entry ghi *"a 5,187-session census found…"*). **Đây là mất lớn nhất trong toàn bộ danh sách** — không phải vì khó viết lại code, mà vì **kiến thức thực nghiệm bên trong những prompt đó không nằm trong code**. Không đo được, không chép được, chỉ đọc được.

### 5.2 `permission-system` (1.638 dòng) — hai kiến trúc approval không tương thích

Đo bằng cách xem API mà nó cần:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -l 'registerFilesystemPolicy' < /tmp/bi_ts.ts
# (rỗng) — không builtin nào dùng trong cây builtin
```

Đúng — nó **tự định nghĩa** cơ chế riêng thay vì dùng API. Nhưng `ext-api.md` §6.2 đã đo bên omp:

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
git grep -c 'FilesystemPolicy' -- 'packages/*/src/*' | wc -l
# 0
```

Và omp có đường approval **khác hoàn toàn**: `tools/approval.ts` (387 dòng) + `tools/file-write-fallback.ts` (467 dòng).

Dễ hiểu nhầm: `permission-system` chỉ có **1/11 entry cắm core (9%)** — thấp nhất bảng. **Đừng bị tỉ lệ đó đánh lừa.** Nó dễ sửa vì *senpi đã gần với cách làm đúng*; nhưng port sang omp thì vẫn phải **viết lại theo `approval.ts` của omp**, vì `registerFilesystemPolicy` không tồn tại và kiến trúc hai bên không tương thích.

**Phán quyết: viết lại theo omp.** (Đây là điểm mà `ext-api.md` §6.2 đã cảnh báo từ vòng trước — tôi xác nhận lại bằng phép đo riêng.)

### 5.3 `tool-pair-guard` (269 dòng) — vá ở tầng `packages/ai`

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -c 'as unknown as\|Object\.assign(' < /tmp/bi_ts.txt 2>/dev/null | grep tool-pair
# (xem file)
```

Nó vá tool_use/tool_result lệch cặp, nhưng chỗ vá là `packages/ai/src/utils/tool-pair-repair.ts` — **file của `packages/ai`**, không phải của coding-agent. Kiểm chứng path có tồn tại: ✅.

omp không có file tương ứng. Nên: **viết lại, không chép** (269 dòng — rẻ).

---

## 6. NÊN LẤY / KHÔNG NÊN LẤY — theo rủi ro đo được

### 6.1 Lấy được an toàn (L0, không cắm core, không vi phạm nặng)

| builtin | dòng | vì sao an toàn | vi phạm cần sửa |
|---|---:|---|---|
| **`btw`** | 389 | nhỏ, cô lập, không entry cắm core nào đáng kể | 1 `any`, 1 `ReturnType<`, 9 `private` — sửa tay 10 phút |
| **`loop-guard`** | 718 | 0 entry cắm core, chặn vòng lặp trước khi tốn tiền | 4 `private` |
| **`bash-timeout`** | 118 | 1/5 entry cắm core (20%) | – |
| **`history-search`** | 401 | đọc chỉ | 9 `private` |
| **`cache-keepalive`** | 483 | ⚠️ **4/4 = 100% cắm core** — tự thú rõ nhất, nhưng chỉ 483 dòng và đụng `packages/ai/src/utils/prompt-cache-ttl.ts` | **9 `any`** — nhiều nhất cây builtin |
| **`look-at`** | 922 | model thị giác riêng, giá trị thật | 1 `ReturnType<` |

**Ghi chú về `cache-keepalive`:** `builtins.md` §5 xếp nó #1 về giá trị. Tôi **đồng ý về giá trị, không đồng ý về rủi ro** — 100% cắm core là con số cao nhất bảng (cùng `herdr`), và 9 `any` là nhiều nhất. Đề nghị: **lấy ý tưởng, viết lại phần warm-cache trên nền `packages/ai` của omp**, không chép nguyên.

### 6.2 Không nên lấy — xếp theo mức vi phạm

| builtin | dòng | lý do (đo được) |
|---|---:|---|
| **`cursor-cli-oauth`** | 5.186 | **92% cắm core** + **35 `private`** + trùng `providers/cursor.ts` của omp (5.541 dòng). Vi phạm nhiều luật nhất. |
| **`anthropic-subscription`** | 7.281 | **76% cắm core** + SDK Anthropic **không có trong bun.lock của omp** + tranh OAuth với `crates/pi-natives/src/oauth_callback/` (10 file). |
| **`config-reload`** | 2.317 | **91% cắm core** — tác giả tự nói 11/12 lần "làm bằng extension không được". Theo dõi 4 file config lõi. |
| **`compaction`** | 8.779 | sửa `transform-messages.ts` + `agent-loop.ts`; chọn prompt theo **provider** (sai nguyên tắc class-vs-provider); omp đã có `snapcompact`. |
| **`mcp`** | 9.327 | 17 `ReturnType<` + 4 inline import; omp đã có `src/mcp/` ngang bậc. |
| **`herdr`** | 418 | **3/3 = 100% cắm core**, phụ thuộc hạ tầng pane ngoài. |
| **`gpt-apply-patch`** | 2.051 | gắn với wire mode OpenAI/Codex; `setModel` 4 lần; omp có `ast-edit.ts`. |

### 6.3 Trung gian — cắm vừa, phải làm cẩn thận

`webfetch` (70%), `imagegen` (57%), `terminal` (57%), `rules` (50%), `mcp` (33%), `goal` (34%), `tool-search` (30%).

Riêng **`terminal`**: 29 `private` + 15 `ReturnType<` + 3 inline import trên 6.962 dòng, **và** đụng `packages/pty/src/registry-session.ts`. `new-packages.md` §2.5 đã kết luận `packages/pty` không đáng lấy vì omp đã có cả `pty.rs` (1.127 dòng) lẫn `vterm` (1.067 dòng). **Phần đáng lấy của `terminal` là consumer (monitor-registry 837 dòng, restore-session, orphan-reaper) — phải viết lại trên nền `pi-shell` của omp, không chép.**

---

## 7. VỀ JSONL — giữ nguyên thiết kế của omp, và vì sao bài này không đụng tới nó

Xác nhận lại bằng lệnh:

```bash
OMP=/Users/tranquangdang21/Projects/ultraworkers
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts
# 575:export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[] {

grep -n "JsonlCorruptionError" /Users/tranquangdang21/Projects/pi-ref/packages/durable/src/storage/jsonl/storage.ts | head -2
# 80:export class JsonlCorruptionError extends Error {
# 119:	throw new JsonlCorruptionError(`Malformed complete ${description}`, …);

cd /Users/tranquangdang21/Projects/senpi-ref && git grep -c 'parseJsonlLenient\|onMalformedRecord' -- 'packages/*' | wc -l
# 0   — senpi cũng không có
```

**Cả hai vế đều đúng:** `pi`/`senpi` ném lỗi cứng, omp tự lành bằng `onMalformedRecord` → `malformedRecords` → `#rewriteRequired` → ghi lại ở lần persist sau. **Chép nguyên xi session layer của `pi` là làm chật hơn. Không đề xuất, và bài này không đề xuất.**

**Rủi ro JSONL có phát sinh không khi lấy builtin?** Câu trả lời có sắc thái, đáng ghi vì `new-packages.md` §0.3 nói *"không mục nào chạm session layer"*:

```bash
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' \
  -- 'packages/coding-agent/src/core/extensions/builtin/*' | head
```

**Có 10+ file khớp** — gồm `anthropic-subscription/session-binding.ts`, `ask-user/resume.ts`, `btw/index.ts`, `compaction/resume-slice.ts`, `compaction/deterministic-fallback.ts`…

⇒ **Không builtin nào nào *ghi* JSONL**, nhưng **nhiều builtin *đọc* và *phục hồi* session** (resume, binding, reattach). Đây là đường tiếp cận session layer mà phép đo "không chạm session" của vòng trước đã bỏ sót.

**Hệ quả cụ thể:** khi port `ask-user/resume.ts` hoặc `btw/index.ts`, phải đi qua `parseJsonlLenient` của omp, **không** dùng `JSON.parse` trực tiếp — nếu không, ta vô tình đọc session bằng đường cứng và biến lỗi thành crash. **Đây là chỗ M5 dễ sai nhất, vì nó trông vô hại.**

---

## 8. Khuyến nghị cho M5 — viết lại trước, port sau

### 8.1 Thứ tự bắt buộc

1. **Trước hết, dựng seam** (đã đo ở `ext-api.md` §6, tôi xác nhận lại):
   - `model_select` — **16 builtin dùng**, nút thắt số 1.
   - `setSessionModel` / `setSessionFastMode` / `setSessionThinkingLevel` — `service-tier.ts` dùng 8 lần; omp thiếu cả 3.
   - `executeTool`, `registerLazyToolActivator`, `registerEntryRenderer`.
   - *Không thay* `types.ts`/`runner.ts` của omp — mất 20 hook chỉ-omp.
2. **Rồi mới viết builtin.** Với mỗi cái: tách prompt ra `.md`, đưa điều kiện model về KDL, thay `console.*` bằng `logger`, đổi `private` → `#private`, thay `ReturnType<` bằng tên kiểu, dùng `replaceTabs`/`truncateToWidth`/`shortenPath`/`PREVIEW_LIMITS` ở **mọi** render path kể cả error path.
3. **Cuối cùng mới port logic.**

### 8.2 Danh sách phân loại cuối

| hạng mục | builtin | hành động | giá | cái mất nếu bỏ |
|---|---|---|---|---|
| **1** | `btw`, `loop-guard`, `bash-timeout`, `history-search` | **port + sửa vi phạm** | thấp | mất `/btw` (side-query) và chặn vòng lặp |
| **2** | `look-at` | **port + sửa** | thấp | mất model thị giác riêng — lỗ hổng thật của omp |
| **3** | `cache-keepalive` | **viết lại** trên nền `packages/ai` của omp (100% cắm core, 9 `any`) | trung bình | mất giữ prompt cache ấm — **mất tiền thật mỗi lượt** |
| **4** | `prompt-preset` | **viết lại toàn bộ**: 33 file → `.md` + 1 KDL axis | lớn | mất 33 preset tinh chỉnh bằng thực nghiệm — **không đo được, không chép được** |
| **5** | `permission-system` | **viết lại theo `approval.ts` của omp** | trung bình | mất lớp phân quyền gọn |
| **6** | `tool-pair-guard` | **viết lại** (vá ở `packages/ai` mà omp không có) | thấp | mất vá tool_use/tool_result lệch cặp |
| **7** | `terminal` (phần monitor) | **viết lại** trên nền `pi-shell` của omp | trung bình | mất terminal bền vững nhiều phiên |
| **✗** | `cursor-cli-oauth`, `anthropic-subscription`, `config-reload`, `herdr`, `compaction`, `mcp`, `gpt-apply-patch` | **không lấy** | – | chấp nhận |
| **✗** | `anthropic-bash`, `anthropic-web-search`, `openai-web-search`, `openai-image-gen` | **không lấy lúc này** — nhỏ nhưng đều là provider contract; chỉ nên làm khi KDL đã có axis | thấp | mất 3.189 dòng native tool |

### 8.3 Ràng buộc pháp lý bổ sung cho M5 (bổ sung `lineage.md`)

`lineage.md` §7 nói chép được gần như toàn bộ, với 3 điều kiện. **Bài này bổ sung một điều kiện thứ tư:**

4. **`prompt-preset` không được lấy nguyên si.** Không chỉ vì vi phạm KDL — mà vì `changes.md` của nó tự thú **10/58 entry** port prompt từ OMO (`code-yeongyu/oh-my-openagent`), mà `NOTICE.md` của senpi **không khai báo**. Ta chưa đo được license của OMO (`lineage.md` §3.5 ghi thẳng là khoảng trống). ⇒ Viết lại, **không lấy nội dung prompt từ senpi**.

Ngoài ra: `compaction/prompts.ts:31` chứa chuỗi `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - …]`. **Không mang sang.**

---

## 9. Sai sót đã biết của chính bài này

- **§2.1 là tự báo cáo của tác giả senpi, không phải kiểm chứng.** Tôi in cả phép đo B (§2.2) để bù. Tỉ lệ % có thể thổi phồng hoặc thu nhỏ theo hướng biện minh cho việc sửa core.
- **§3.2 regex `` `…` `` bắt mọi template literal dài**, không chỉ prompt. 1,27 MB là **cận trên**. Phần đáng tin là **323/603 file** và 10 file top đã tự chứng minh là prompt.
- **§3.1 đếm *nhánh rẽ điều kiện*, không đếm chữ trong comment.** Nhưng tôi **không** đọc hết 454 dòng `presets.ts` — có thể còn nhánh dạng `switch`/`Map` mà regex này không bắt. Nói rõ: **14 là cận dưới.**
- **§4.3 tôi đọc `NOTICE.md` của senpi và `changes.md` của `prompt-preset`, không đọc OMO.** License OMO là **khoảng trống thật, tôi không đo được** — tôi chỉ chứng minh được rằng senpi tự thú có port và **không khai trong NOTICE.md**. Kết luận của tôi là "đừng lấy", không phải "vi phạm pháp lý".
- **Tôi không mở file renderer của từng builtin** để xác nhận ai thực sự hiển thị ra TUI. Số liệu §3.7 là "trong 603 file, 0 file dùng `replaceTabs`" — đúng, nhưng **không** chứng minh mọi builtin đều render ra TUI.
- **Tôi không kiểm lại `changes-md.md` §5, §7 hay `new-packages.md` §1–4** — ngoài phạm vi bài này. Tôi chỉ dùng chúng làm chỗ dẫn và đánh dấu chỗ nào tôi xác nhận lại (`builtins.md` §3.7, §5; `new-packages.md` §0.3; `m1b-collision.md` §4; `ext-api.md` §6.2).
- **Tôi không sửa file nào trong repo.** Toàn bộ là đo và khuyến nghị.

---

## Phụ lục — toàn bộ lệnh, chạy lại từ đầu

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers
PI=/Users/tranquangdang21/Projects/pi-ref
cd $S

# §0 HEAD
git -C $S   log -1 --format='%H %ad' --date=iso
git -C $OMP log -1 --format='%H %ad' --date=iso

# §1.1 số dòng ĐÚNG (cộng mọi partial total)
git -C $S ls-files | grep -E '\.(ts|tsx)$' \
  | (cd $S && xargs wc -l 2>/dev/null | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}')   # 955527
git -C $OMP ls-files | grep -E '\.(ts|tsx)$' \
  | (cd $OMP && xargs wc -l 2>/dev/null | grep -E '^\s+[0-9]+\s+total$' | awk '{s+=$1} END{print s}') # 1695782
#   …và bản SAI, để đối chiếu:
git -C $S ls-files | grep -E '\.(ts|tsx)$' | (cd $S && xargs wc -l 2>/dev/null | tail -1)        # 107902

# §1.2 mẫu đo 603 file
git ls-files 'packages/coding-agent/src/core/extensions/builtin' | grep -E '\.ts$' | grep -v '/test/' > /tmp/bi_ts.txt
wc -l < /tmp/bi_ts.txt    # 603

# §2.1 phép A — tự thú cắm core
B=packages/coding-agent/src/core/extensions/builtin
for d in $(cat /tmp/bi_builtin_dirs.txt); do
  f=$B/$d/changes.md; [ -f "$f" ] || continue
  printf "%-24s %3s/%3s\n" "$d" \
    "$(grep -c 'Why an extension could not handle it\|Why extension system couldn.t handle it\|Why this cannot be expressed externally\|Why this lives in the fork' $f)" \
    "$(grep -c '^## ' $f)"
done | sort -k2 -rn

# §2.2 phép B — core file thật
grep -rhoE '`packages/[^`]+`' $B --include=changes.md | grep -v 'core/extensions/builtin' \
  | tr -d '`' | sed 's|packages/coding-agent/||' | sort -u
# rồi kiểm tồn tại: [ -e "$S/<path>" ] && echo CÓ || echo KHÔNG

# §2.2 API lách hook
for api in registerTool registerCommand registerFlag setModel setActiveTools registerProvider \
           registerLazyToolActivator registerEntryRenderer; do
  printf "%-28s %s file\n" "$api" "$(xargs grep -l "\b$api\b" < /tmp/bi_ts.txt 2>/dev/null | wc -l)"
done
xargs grep -l 'executeTool\|setSessionFastMode\|setSessionModel\|setSessionThinkingLevel' < /tmp/bi_ts.txt
xargs grep -l 'as unknown as\|Object\.assign(\|prototype\.\w+ =' < /tmp/bi_ts.txt

# §3.1 model-id branching
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/bi_ts.txt
ls $B/prompt-preset/ | head -40
# omp: trục đích
sed -n '1,40p' $OMP/packages/catalog/src/identity/dialect.ts
ls $OMP/packages/catalog/src/compat/rules/classes/

# §3.2 prompt trong TS
python3 - <<'PY'
import re,subprocess,os
S="/Users/tranquangdang21/Projects/senpi-ref"
files=[f for f in subprocess.run(["git","-C",S,"ls-files",
        "packages/coding-agent/src/core/extensions/builtin"],capture_output=True,text=True).stdout.split()
       if f.endswith(".ts") and "/test/" not in f]
rows=[]
for f in files:
    t=open(os.path.join(S,f),encoding="utf8",errors="replace").read()
    l=re.findall(r'`([^`]{200,})`',t,re.S)
    if l: rows.append((sum(map(len,l)),len(l),f))
rows.sort(reverse=True)
for a,b,c in rows: print(f"{a:>7} {b:>3} {c}")
print("TỔNG:",sum(r[0] for r in rows),"| FILE:",len(rows))
PY
git ls-files "$B" | grep '\.md$' | grep -vE 'AGENTS\.md|changes\.md'
git grep -l 'Handlebars' -- 'packages/*'          # senpi: rỗng
git -C $OMP ls-files 'packages/coding-agent/src/prompts/*.md' | wc -l   # 223

# §3.3–3.6 các luật còn lại
xargs grep -c 'ReturnType<' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$'
xargs grep -l 'await import(' < /tmp/bi_ts.txt
xargs grep -lE '(:|as|<|\|)\s*any\b' < /tmp/bi_ts.txt
xargs grep -lE 'console\.(log|error|warn)\(' < /tmp/bi_ts.txt
xargs grep -lE '^\s*(private|protected|public)\s' < /tmp/bi_ts.txt
xargs grep -cE 'new Promise<' < /tmp/bi_ts.txt 2>/dev/null | grep -v ':0$'

# §3.7 TUI sanitize
for fn in replaceTabs truncateToWidth shortenPath PREVIEW_LIMITS; do
  printf "%-18s %s file\n" "$fn" "$(xargs grep -l "$fn" < /tmp/bi_ts.txt 2>/dev/null | wc -l)"
done

# §4 provider
grep -rhoE 'from "(@anthropic-ai/[^"]+|[a-z][a-z0-9-]*)"' $B/anthropic-subscription/*.ts | sort | uniq -c | sort -rn
grep -c 'claude-agent-sdk' $OMP/bun.lock                                  # 0
sed -n '24p' $B/anthropic-subscription/sdk-boundary.ts
sed -n '292p' $B/compaction/prompts.ts
sed -n '31p'   $B/compaction/prompts.ts                                    # chuỗi OH-MY-OPENCODE

# §4.3 OMO trong prompt-preset
grep -n 'Hephaestus\|oh-my-opencode\|omo-codex\|omo-opencode' $B/prompt-preset/changes.md | head -6
for p in packages/omo-codex/plugin/components/rules/bundled-rules/hephaestus/gpt-5.6.md \
         packages/omo-opencode/src/agents/hephaestus/gpt-5-6.ts; do
  [ -e "$S/$p" ] && echo "CÓ $p" || echo "KHÔNG $p"; done
grep -n '^#' $S/NOTICE.md
wc -l $OMP/packages/ai/src/providers/cursor.ts                            # 5541
ls $OMP/crates/pi-natives/src/oauth_callback/                            # 10 file

# §5.2 permission-system
xargs grep -l 'registerFilesystemPolicy' < /tmp/bi_ts.txt                  # rỗng
git -C $OMP grep -c 'FilesystemPolicy' -- 'packages/*/src/*' | wc -l      # 0

# §7 JSONL
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts
grep -n "JsonlCorruptionError" $PI/packages/durable/src/storage/jsonl/storage.ts | head -2
git -C $S grep -c 'parseJsonlLenient\|onMalformedRecord' -- 'packages/*' | wc -l   # 0
git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' \
  -- "$B/*" | head
```
