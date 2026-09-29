# PHẢN BIỆN `deep-risk.md` — bác bỏ được gì, không bác bỏ được gì

> Viết **2026-09-28**. Cây đo:
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref
> OMP=/Users/tranquangdang21/Projects/ultraworkers
> PI=/Users/tranquangdang21/Projects/pi-ref
> ```
> Mọi khẳng định dưới đây kèm **lệnh đã chạy + đường dẫn + số**. Người đọc 6 tháng sau tự chạy lại được.

---

## 0. GHI CHÚ ĐẦU FILE: tên file trong đề không tồn tại

Đề bài yêu cầu bác bỏ `/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/senpi-md/deep-miss.md`.

```bash
ls -la /Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/senpi-md/
```

**Không có file `deep-miss.md`.** Thư mục có 7 file; file `deep-*.md` duy nhất là **`deep-risk.md`** (978 dòng, sửa lúc 12:52, mới nhất trong nhóm). Tôi bác bỏ `deep-risk.md`.

```bash
# đổi tên nếu muốn khớp đề:
# mv deep-risk.md deep-miss.md
```

Đây không phải chuyện nhỏ: nếu orchestrator gọi nhầm tên, nó sẽ bác bỏ trúng nhầm (hoặc báo "không có file" và tưởng vòng hỏng).

---

## 1. TÓM TẮT

| | số |
|---|---|
| Khẳng định **bác bỏ được** (sai, hoặc đúng nhưng lập luận sai) | **22** |
| Trong đó **sai về số** (đo sai, tác giả tự ghi sai) | **16** |
| Khẳng định **không bác bỏ được** (đã chạy lại, khớp tuyệt đối) | **26** |
| Lỗi lớn nhất | `§3.6` "TỔNG: 35 `private`" → thật là **197** (sai 5,6×) |

**Bài viết này tốt ở chỗ nó cảnh báo phép đo sai (§1.1 về `wc -l | tail -1`) và thành thật về giới hạn của mình (§9). Nhưng nó tự mắc đúng những lỗi nó vừa dạy tránh: cộng sai tổng, đếm sai số phần tử, và — nghiêm trọng nhất — **tự thêm một dòng bằng tay vào kết quả của lệnh mà lệnh đó không sinh ra.**

---

## 2. BÁC BỎ ĐƯỢC — nhóm A: số đếm sai

### A1. 🔴 `§3.6` "TỔNG: 35 modifier `private`" — **thật là 197**. Sai 5,6×

Lệnh của tác giả, chạy y nguyên:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/vr_bi_ts.txt 2>/dev/null \
  | grep -v ':0$' | awk -F: '{s+=$2} END{print "TỔNG:",s}'
# TỔNG: 197
```

Phép thứ hai, độc lập (đếm dòng thẳng, không qua `awk`):

```bash
xargs grep -hE '^\s*(private|protected|public)\s' < /tmp/vr_bi_ts.txt 2>/dev/null | wc -l
# 197
```

**Hai phép cùng cho 197. Con số 35 là số của riêng `cursor-cli-oauth`.** Tức tác giả lấy số của một builtin để điền vào ô "tổng".

Bằng chứng tự mâu thuẫn: ngay dòng kế tiếp §3.6 liệt kê *"cursor-cli-oauth 35 chỗ, goal 21, terminal 29, anthropic-subscription 18, todotools 10"* → 35+21+29+18+10 = **113**, đã gấp 3 lần "TỔNG: 35" mà tác giả tự ghi.

Tách per-builtin cho đúng:

```bash
xargs grep -cE '^\s*(private|protected|public)\s' < /tmp/vr_bi_ts.txt 2>/dev/null | grep -v ':0$' \
 | awk -F: '{split($1,a,"/builtin/"); d=a[2]; sub("/.*","",d); s[d]+=$2} END{for(k in s) printf "%-24s %4d\n",k,s[k]}' | sort -k2 -rn
```

```
cursor-cli-oauth 35 · terminal 29 · goal 21 · gpt-apply-patch 19 · anthropic-subscription 18
todotools 10 · permission-system 9 · loop 9 · history-search 9 · btw 9 · herdr 8
help 7 · loop-guard 4 · hooks 4 · rules 3 · nested-agents-md 2 · mcp 1
TỔNG 197
```

→ **Cột `private` trong bảng §3.8 là ĐÚNG từng dòng.** Chỉ ô "TỔNG" trong §3.6 sai. Nghĩa là bảng §3.8 tốt hơn §3.6, và người đọc nên tin bảng.

*Hệ quả không đổi phán quyết:* kết luận "35 `private` ở `cursor-cli-oauth` là lý do thêm để không lấy" vẫn đúng, vì 35 là con số thật của `cursor-cli-oauth`.

### A2. 🔴 `§3.1` "14 dòng khớp" — **thật là 13**. Dòng thứ 14 được thêm tay

Lệnh của tác giả, chạy y nguyên:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
xargs grep -nE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"' < /tmp/vr_bi_ts.txt | wc -l
# 13
```

13 dòng thật (in hết):

```
mcp/config.ts:49                      includes("claude")
prompt-preset/presets.ts:70,73,76,79,82   includes("gpt-5.6"|"5.5"|"5.4"|"5.3"|"5.2")
prompt-preset/presets.ts:269          includes("opus-5")
prompt-preset/presets.ts:276,279,282,285   includes("opus-4-8"|"4-7"|"4-6"|"4-5"/"4.5")
tool-search/native-support.ts:26      model.id.includes("haiku")
websearch/websearch/native.ts:35      !model.id.includes("codex")
```

**`compaction/prompts.ts:292` — dòng thứ 14 trong khối in ra của tác giả — KHÔNG được lệnh đó sinh ra.** Kiểm chứng bằng cách đưa đúng dòng đó vào chính regex:

```bash
echo '	return /^gpt-|^o\d|codex/.test(model.id ?? "") || model.provider === "openai" || model.provider === "azure-openai"' \
  | grep -cE '\.(includes|startsWith|endsWith)\(\s*"(claude|gpt|o[0-9]|gemini|grok|kimi|glm|deepseek|codex|cursor|qwen|llama|sonnet|opus|haiku)[^"]*"'
# 0
```

Lý do: dòng 292 là `/regex/.test(...)`, không phải `.includes("…")`. Nó là một `switch`/`Map` dạng khác — **đúng loại mà §9 của tác giả tự nói "có thể còn nhánh dạng `switch`/`Map` mà regex này không bắt"**. Tác giả đã biết lỗ hổng, rồi lấp nó bằng cách tự thêm một dòng không thuộc phép đo.

### A3. 🔴 `§3.1` "13/14 nằm trong `prompt-preset` + `compaction`" — **thật là 10/13**

Phân bố thật:

```bash
sed 's|.*/builtin/||' /tmp/vr_31.txt | cut -d: -f1 | cut -d/ -f1 | sort | uniq -c | sort -rn
# 10 prompt-preset · 1 websearch · 1 tool-search · 1 mcp
```

`compaction` = **0** dòng khớp (xem A2). Nên:

- Tác giả nói **93%** (13/14) → thật **77%** (10/13).
- Lập luận *"Đây không phải tai nạn — nó là **cấu trúc**"* yếu đi rõ rệt: gần một phần tư số khớp nằm ở 3 builtin khác.

### A4. 🔴 `§0.1` và `§3.1` "presets.ts:70-285 có **11** nhánh" — **thật là 10**

Chính khối in của §3.1 liệt kê đúng 10 dòng: `70, 73, 76, 79, 82, 269, 276, 279, 282, 285`. Không có dòng thứ 11. `§9` lại ghi "**14 là cận dưới**" cho §3.1 — nhưng 14 vốn đã sai (A2), nên "cận dưới" sai theo cả hai đầu.

### A5. 🟠 `§3.1` "**33 file preset**" — thật là 38 `.ts`; chỉ **31** file mang tên model-id

```bash
ls packages/coding-agent/src/core/extensions/builtin/prompt-preset/*.ts | wc -l
# 38
```

Chia nhỏ:

| nhóm | số file |
|---|---:|
| tên chính là model-id | **31** |
| preset không phải model (`execution-tooling`, `file-operations`, `gpt-eval-routing`, `test-decision`) | 4 |
| hạ tầng (`index.ts`, `presets.ts`, `settings.ts`) | 3 |
| **tổng** | **38** |

`§0.1` nói *"33 file preset, **tên file chính là model id**"* — không khớp số nào. Mệnh đề "tên file chính là model id" thì **đúng 31/38**, chỉ là không phải 33/33.

**18 số dòng trong bảng §3.1 thì tôi kiểm hết — tất cả đúng tuyệt đối** (`gpt-6-astra` 400, `claude-opus-5` 132, `glm-5` 18, `gpt-5.6` 240, `kimi-k3` 123, `grok-4.7` 122, …). Không bác bỏ được phần này.

### A6. 🔴 `§2.2 B1` "10 path lõi thật, **tất cả đều tồn tại**" — sai cả đếm lẫn tồn tại

Tác giả gọi đây là *"**bằng chứng cứng nhất** trong toàn bộ tài liệu"*. Kiểm từng path:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
for p in packages/agent/src/agent-loop.ts packages/ai/src/api/transform-messages.ts \
         packages/ai/src/providers/cursor.ts packages/ai/src/utils/prompt-cache-ttl.ts \
         packages/ai/src/utils/retry.ts packages/ai/src/utils/tool-pair-repair.ts \
         packages/pty/src/registry-session.ts packages/senpi-codemode/src/prompt/eval-prompt.ts \
         packages/coding-agent/src/capability/rule.ts packages/coding-agent/src/config.ts \
         packages/coding-agent/src/core/messages.ts; do
  [ -e "$S/$p" ] && echo "CÓ   $p" || echo "KHÔNG $p"
done
```

```
CÓ   packages/agent/src/agent-loop.ts
CÓ   packages/ai/src/api/transform-messages.ts
CÓ   packages/ai/src/providers/cursor.ts
CÓ   packages/ai/src/utils/prompt-cache-ttl.ts
CÓ   packages/ai/src/utils/retry.ts
CÓ   packages/ai/src/utils/tool-pair-repair.ts
CÓ   packages/pty/src/registry-session.ts
CÓ   packages/senpi-codemode/src/prompt/eval-prompt.ts
KHÔNG packages/coding-agent/src/capability/rule.ts      ← bảng §2.2 đánh dấu ✅
CÓ   packages/coding-agent/src/config.ts
CÓ   packages/coding-agent/src/core/messages.ts
```

- **Số đếm: 11 path, không phải 10.** Bảng §2.2 gộp ba path vào một dòng (`src/capability/rule.ts · src/config.ts · src/core/messages.ts`) rồi đếm như một.
- **`packages/coding-agent/src/capability/rule.ts` không tồn tại.** Không phải chỉ sai đường dẫn — senpi **không có thư mục `capability/` nào**:

```bash
git -C $S ls-files | grep -E '(^|/)capability/'   # rỗng
find $S -path '*/capability/*' -not -path '*/node_modules/*'   # rỗng
```

(Đáng chú ý: **omp** thì *có* `packages/coding-agent/src/capability/extension-module.ts`. Path này trông như bị mang nhầm từ omp sang.)

→ Vì vậy câu **"tất cả đều tồn tại"** sai. 10/11 đúng. Kết luận cốt lõi ("builtin đào vào `packages/ai` và `packages/agent`") vẫn đứng vững vì 8 path còn lại đều thật.

### A7. 🟠 `§4.5` / `§8.2` "**3.189 dòng**" — không cộng được ra số này

```bash
python3 -c "
a=[('anthropic-bash',103),('anthropic-web-search',249),('openai-web-search',272),
   ('openai-image-gen',414),('gpt-apply-patch',2051)]
print('5 dòng bảng §4.5      =', sum(v for _,v in a))
print('4 dòng ghi \"viết lại\"  =', sum(v for k,v in a if k!='gpt-apply-patch'))"
# 5 dòng bảng §4.5      = 3089
# 4 dòng ghi "viết lại"  = 1038
```

- `§4.5`: "Tổng 5 cái này = **3.189**" → thật **3.089** (sai 100).
- `§8.2`: "mất **3.189** dòng native tool" cho nhóm **4** builtin "không lấy lúc này" → thật **1.038** (phóng đại **3,07×**).

Đây là con số nằm trong cột "cái mất nếu bỏ" — tức phần dùng để cân đo giá. Phóng đại 3× ở đó là lỗi nghiêm trọng nhất về mặt quyết định.

### A8. 🟠 `§2.2 B2` "`setModel` 3 file" — **thật là 8 file**

Nguyên nhân: lệnh của tác giả dùng `\b` — `grep -l "\b$api\b"`. Chạy đúng trên máy này (BSD grep, macOS):

```bash
for api in registerTool setModel registerCommand; do
  printf "%-16s %s\n" "$api" "$(xargs grep -l "\b$api\b" < /tmp/vr_bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')"
done
# registerTool 22   setModel 3   registerCommand 26      ← khớp §2.2

for api in registerTool setModel registerCommand; do
  printf "%-16s %s\n" "$api" "$(xargs grep -l "$api"      < /tmp/vr_bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')"
done
# registerTool 24   setModel 8   registerCommand 26      ← không \b
```

5 file bị rớt khi dùng `\b`: `anthropic-subscription/tool-watch.ts`, `tool-search/service.ts` (cho `registerTool`); cộng 5 file nữa cho `setModel`.

**Không nói `\b` là sai** — nó đúng cho "từ độc lập". Nhưng `setModel` bị đo là 3 trong khi thật là 8: đây là **setter lách hook** mà §2.2 đang xếp hạng mức cắm core, và nó bị đánh giá thấp 2,7×. Nếu ai đó port theo con số này, họ sẽ tưởng chỉ 3 builtin đụng `setModel`.

*Không bác bỏ được:* `registerCommand` 26, `setActiveTools` 20, `registerFlag` 8, `registerProvider` 4, `registerLazyToolActivator` 3, `registerEntryRenderer` 5 — tôi chạy lại, **tất cả khớp tuyệt đối**.

### A9. 🟠 `§3.4` "ghi chú công bằng" — **sai, và gọi một file không tồn tại**

Tác giả viết: *"`terminal/pty.lazy.ts` và `webfetch/content.lazy.ts` là **lazy chunking, không phải `await import()` thô**. Chỉ 4 file là vi phạm thật."*

```bash
grep -n 'await import(' packages/coding-agent/src/core/extensions/builtin/terminal/pty.lazy.ts
# 18:	loaded ??= await import("@earendil-works/pi-pty");

grep -n 'await import(' packages/coding-agent/src/core/extensions/builtin/mcp/sdk.lazy.ts
# 53:	const module = await import("@modelcontextprotocol/sdk/client/auth.js");

ls packages/coding-agent/src/core/extensions/builtin/webfetch/
# changes.md  index.ts  webfetch/
```

- `pty.lazy.ts` **có `await import()` thật** ở dòng 18, và nó **có** nằm trong 4 file mà lệnh của tác giả trả về. Không thể vừa "là lazy chunking" vừa là 1/4 vi phạm.
- `webfetch/content.lazy.ts` **không tồn tại** — thư mục `webfetch/` chỉ có `changes.md`, `index.ts`, `webfetch/`.

Cùng dòng đó, tác giả cảnh báo *"**Đừng đếm nhầm 20 file `.lazy.ts`**"*. Số thật:

```bash
git -C $S ls-files 'packages/coding-agent/src/core/extensions/builtin' | grep '\.lazy\.ts$' | grep -v '/test/' | wc -l
# 4
```

Không có 20 file `.lazy.ts`; có **4** — và cả 4 đều chứa `await import()`.

### A10. 🟠 `§3.8` cột "inline import" **mâu thuẫn với §3.4** và với thực tế

| nơi | mcp | terminal | imagegen | tổng |
|---|---:|---:|---:|---:|
| §3.4 (đúng) | — | — | — | **4 file** |
| §3.8 (sai) | 4 | 3 | 1 | **8** |
| thật | 1 file | 2 file | 1 file | **4 file / 4 occurrence** |

```bash
xargs grep -l 'await import(' < /tmp/vr_bi_ts.txt
# imagegen/index.ts, mcp/sdk.lazy.ts, terminal/manager.ts, terminal/pty.lazy.ts
```

Bảng §3.8 phóng đại gấp đôi so với chính §3.4 ngay phía trên nó.

### A11. 🟡 `§3.7` "`.slice(0, N)` — 12 file khớp" — thật là 18

```bash
xargs grep -l '\.slice(0, *[0-9]' < /tmp/vr_bi_ts.txt | wc -l
# 18
```

Chi tiết phụ, nhưng nó là căn cứ cho câu "mọi renderer tự làm việc riêng".

### A12. 🟡 `§3.1` "`classes/` có **18** file `.kdl`" — thật là **19**

```bash
ls /Users/tranquangdang21/Projects/ultraworkers/packages/catalog/src/compat/rules/classes/*.kdl | wc -l
# 19
```

Danh sách tác giả liệt kê thiếu **`gpt-oss.kdl`** (3,9 KB). Câu "**đủ 18 họ** mà `prompt-preset` phục vụ" xây trên danh sách thiếu.

### A13. 🟡 `§3.1` "`preferredDialect` … trả **12** dialect" — thật là 11

Union `Dialect` trong `packages/catalog/src/identity/dialect.ts:3-13` có 11 phần tử: `glm · hermes · kimi · xml · anthropic · deepseek · harmony · qwen3 · gemini · gemma · minimax`. **Chính khối code tác giả dán trong bài cũng chỉ có 11.**

*Không bác bỏ được:* `preferredDialect` nằm đúng dòng 19, `switch` kết thúc đúng dòng 40. Vị trí chính xác.

### A14. 🟡 `§4.1`/`§6.2` "`oauth_callback/` — 10 file, **146 KB**" — 10 file đúng, **146 KB sai**

```bash
git -C $OMP ls-files crates/pi-natives/src/oauth_callback/ | wc -l   # 10  ✓
du -sk crates/pi-natives/src/oauth_callback/                        # 184
```

184 KB, không phải 146 KB. (Lưu ý cho người đọc sau: `ls … | wc -l` cho **12** vì tính cả `.` và `..` — phải dùng `git ls-files`.)

### A15. 🟡 `§7` "**10+ file** khớp" khi grep session layer — thật là **26 file**

```bash
cd $S && git grep -ln 'session-manager\|sessionManager\.append\|persistSession\|rewriteRequired' \
  -- 'packages/coding-agent/src/core/extensions/builtin/*' | wc -l
# 26
```

11 builtin: `anthropic-subscription, ask-user, btw, cache-keepalive, compaction, goal, look-at, loop, openai-image-gen, terminal, todotools`.

Hướng thì đúng (tác giả **nói dưới** mức thực tế, không phóng đại), nhưng con số sai. 5 file tác giả nêu tên đều tồn tại ✓.

### A16. 🟡 `§3.3` "78 **chỗ**" là 78 **dòng** / 79 occurrence

```bash
xargs grep -c  'ReturnType<' < /tmp/vr_bi_ts.txt | grep -v ':0$' | awk -F: '{s+=$2} END{print s}'  # 78 (dòng)
xargs grep -oh 'ReturnType<' < /tmp/vr_bi_ts.txt | wc -l                                    # 79 (lần xuất hiện)
```

Bảng phân bố §3.3 khớp **tuyệt đối** (mcp 17 · terminal 15 · anthropic-subscription 10 · hooks 6 · compaction 6 · config-reload 5 · cursor-cli-oauth 3). Riêng tiêu đề "78 chỗ, **tập trung ở 4 builtin**" thì bảng liệt kê **7** builtin từ 3 trở lên — tự mâu thuẫn nhẹ.

---

## 3. BÁC BỎ ĐƯỢC — nhóm B: lập luận sai, số thì đúng

### B1. 🔴 `§4.3` — khẳng định "không một dòng code OMO nào nằm trong senpi" **được kiểm chứng bằng một lệnh cho ra 41 file**

Tác giả viết (nguyên văn):

> *"Câu đó **đúng về code** — tôi xác nhận, `git grep -iE 'oh-my-openagent|/omo/'` không ra gì."*

Chạy đúng lệnh đó:

```bash
cd /Users/tranquangdang21/Projects/senpi-ref
git grep -ilE 'oh-my-openagent|/omo/' | wc -l
# 41
```

**Không phải "không ra gì" — 41 file.** Và khi dùng mẫu đúng (bỏ `/omo/` vốn đòi dấu gạch chéo) thì lộ ra thứ mà bài đang phủ nhận:

```bash
git grep -ilE 'oh-my-openagent|oh-my-opencode' -- 'packages/*/src/*.ts'
```

```
packages/coding-agent/src/beta/omo-local-update.ts            (880 dòng)
packages/coding-agent/src/beta/omo-local-update-artifacts.ts   (88)
packages/coding-agent/src/beta/omo-local-update-fingerprint.ts (62)
packages/coding-agent/src/beta/omo-local-update-worker.ts      (62)
                                                                  ── 1.092 dòng
```

Đây **không phải changelog**. Đó là một module beta hạ tầng: dòng 152–154 của nó đọc tên package của plugin OMO

```typescript
"@code-yeongyu/omo-senpi"   ·   "@oh-my-opencode/omo-senpi"   ·   "@oh-my-opencode/senpi-task"
```

và dòng 208–212 ghi `git rev-parse origin/dev:packages/omo-senpi` — tức nó **fetch và checkout trực tiếp từ monorepo OMO**.

**Công bằng với tác giả:** module này *tiêu thụ* OMO (cập nhật plugin OMO đã cài), không phải *chép từ* OMO. Nên mệnh đề hẹp "không có code được chép từ OMO" **có thể vẫn đúng**, và tôi không bác bỏ được mệnh đề đó. Nhưng:

1. **Phép kiểm chứng đưa ra là sai** — lệnh được trích dẫn trả về 41 file, tác giả ghi "không ra gì". Đây là loại lỗi nặng nhất: một khẳng định âm tính ("không có") được gắn một lệnh không hỗ trợ nó.
2. **Khung "khoảng trống pháp lý" của §0.2 và §8.3 không đầy đủ.** Bài dựng cả cảnh báo pháp lý quanh ý *"prompt OMO lọt qua `.ts` nên không bị bộ lọc file bắt"*. Sự thật mạnh hơn: senpi ship **một module 1.092 dòng phụ thuộc runtime vào tên package và layout repo của OMO**. Rủi ro không chỉ là "text prompt không được khai báo", mà là toàn bộ quan hệ OMO–senpi không nằm trong `NOTICE.md`.

Điều này **củng cố** kết luận "đừng lấy `prompt-preset`" của tác giả — chỉ là vì lý do khác và mạnh hơn.

*Không bác bỏ được phần còn lại của §4.3*, tôi đã kiểm từng dòng: `changes.md` dòng **1105, 1110, 1121, 1137** khớp chính xác; đếm entry bằng python cho **10 / 58** ✓; `NOTICE.md` có heading ở dòng **1, 3, 25, 37, 53** ✓ và **không có** dòng nào nhắc omo/opencode/hephaestus/openagent ✓; hai path OMO **không tồn tại** ✓.

### B2. 🔴 Lỗ hổng phương pháp: **13/40 builtin không có `changes.md`**, và bài xếp hạng chúng như "rủi ro thấp"

```bash
cd $S; B=packages/coding-agent/src/core/extensions/builtin
for d in $(git ls-files "$B" | sed 's|.*/builtin/||' | cut -d/ -f1 | sort -u); do
  [ -f "$B/$d/changes.md" ] || echo "NO changes.md: $d"
done | grep -v '\.ts$\|\.md$\|\.json$'
```

```
account · anthropic-bash · anthropic-web-search · ask-user · history-search · hooks
look-at · loop · model-fallback · openai-web-search · recommended-models
rule-activation · tool-pair-guard · video-in
```

**13 builtin (32,5%) không có file tự thú.** Toàn bộ phân loại L0–L3 ở §2.3 và bảng "**Lấy được an toàn**" ở §6.1 đều dựa trên §2.1 — nên với 13 builtin này, **không có phép đo nào tồn tại**, và bài xử chúng như "không cắm core".

Hệ quả cụ thể, trong chính bảng §6.1:

- **`look-at`** — xếp vào hàng **2** của kế hoạch M5, ghi *"vì sao an toàn"*. Nhưng nó **không có `changes.md`** ⇒ §2.1 chưa từng đo nó.
- **`history-search`** — xếp hạng **1**. Cũng **không có `changes.md`**.

§9 liệt kê 6 giới hạn của bài mà **không nói ra chỗ này**. Đây là lỗ hổng lớn nhất về phương pháp: *"không có tự thú"* bị đọc thành *"không cắm core"*, hai đẳng thức này khác nhau.

### B3. 🟠 `§2.3` tiêu chí L0/L3 tự mâu thuẫn với chính bảng §2.1

- L0 định nghĩa là *"0 entry, hoặc **≤20%**"* — nhưng đặt `btw` (**40%**) vào L0.
- L3 định nghĩa là *"**≥90%** entry tự thú … **VÀ** import `@anthropic-ai/*` SDK"* — nhưng đặt `anthropic-subscription` (**76%**) vào L3, tự thêm điều kiện "+ SDK" để lách.

Phán quyết cuối cùng vẫn có lý, nhưng tiêu chí viết ra không tái tạo được phán quyết — người đọc không kiểm được.

### B4. 🟠 `§3.5` và `§3.8` trộn hai đơn vị mà không nhãn

| | §3.5 (đơn vị: **file**) | §3.8 (cột, đơn vị: **occurrence**) |
|---|---|---|
| `any` | "10 file" ✓ (đúng) | tổng cột = 20, **thật 22** (bỏ sót `video-in` 2) |
| `console.*` | "5 file" ✓ (đúng) | tổng cột = **10** ✓ |

Không sai số, nhưng cột §3.8 không ghi đơn vị → người đọc cộng cột "số file" của §3.5 với cột "số lần" của §3.8 sẽ ra con số vô nghĩa.

### B5. 🟠 `§8.1` trỏ sai đường dẫn extension API của omp

Tác giả viết: *"**Không thay** `types.ts`/`runner.ts` của omp — mất 20 hook chỉ-omp."*

```bash
cd $OMP && git ls-files 'packages/coding-agent/src/core/extensions/' | wc -l
# 0   ← omp KHÔNG có thư mục này
```

omp không có `core/extensions/`. Extension API của omp nằm ở:

```
packages/coding-agent/src/extensibility/extensions/types.ts
packages/coding-agent/src/extensibility/extensions/runner.ts
packages/coding-agent/src/extensibility/extensions/loader.ts
```

Cảnh báo "đừng thay" vẫn đúng chỗ; sai chỗ dẫn người đọc tìm một thư mục không tồn tại. Còn con số **"20 hook chỉ-omp"** thì tôi **không đo được** — tác giả cũng không đưa lệnh đếm. Ghi là chưa kiểm chứng, không phải sai.

### B6. 🟡 `§7` "Không builtin nào *ghi* JSONL" — **khẳng định không kèm lệnh**

§7 nói: *"⇒ **Không builtin nào nào** \*ghi\* JSONL, nhưng nhiều builtin \*đọc\* và \*phục hồi\* session."*

Câu quan trọng này **không có lệnh nào đi kèm** — vi phạm đúng tiêu chuẩn bài tự đặt ở phần đầu. Tôi đo thử:

```bash
git -C $S grep -ln 'writeFileSync\|Bun.write\|appendFileSync' \
  -- 'packages/coding-agent/src/core/extensions/builtin/*'
# 9 file — nhưng đều là config/token/trust storage, KHÔNG phải session JSONL
```

**Kết luận của câu vẫn đúng** (9 file đó ghi credentials, MCP token store, trust storage, config — không file nào ghi session JSONL). Nhưng nó đúng **may mắn**, không phải vì đã đo. Đây là cây "không có" được khẳng định mà không dò; theo luật của chính bài, phải ghi rõ là chưa đo.

*Không bác bỏ được phần cốt lõi của §7:* `parseJsonlLenient` ở `packages/utils/src/stream.ts:575` ✓; `JsonlCorruptionError` ở `pi/packages/durable/src/storage/jsonl/storage.ts:80` và lệnh `throw` ở dòng 119 ✓; senpi có 0 file chứa `parseJsonlLenient`/`onMalformedRecord` ✓. **Kết luận "chép nguyên xi session layer của `pi` là làm chật hơn" vẫn đúng, và phải giữ.**

---

## 4. KHÔNG BÁC BỎ ĐƯỢC — đã chạy lại, khớp tuyệt đối

Ghi lại để người đọc sau không mất công kiểm lại, và để thấy phần lớn bài **đáng tin**:

**Nền tảng**
- senpi 5.554 file `.ts+.tsx` ✓ · 955.527 dòng ✓ (hai phép độc lập: `awk` cộng mọi dòng `total`, và `xargs cat | wc -l` — cùng 955.527)
- omp 5.522 file ✓ · 1.695.782 dòng ✓ (cũng hai phép, cùng kết quả)
- `xargs wc -l | tail -1` → **107.902** ✓ — bài học §1.1 **đúng và đáng giữ**. Đây là đóng góp tốt nhất của bài.
- 40 builtin ✓ · 603 file `.ts` trừ test ✓ · 41 file `.md` ✓ với đúng 2 file không phải `AGENTS.md`/`changes.md` ✓

**§2.1 — bảng tự thú: tái tạo CHÍNH XÁC cả 23 dòng** (`herdr 3/3`, `cache-keepalive 4/4`, `config-reload 11/12`, `cursor-cli-oauth 12/13`, `anthropic-subscription 53/69`, `compaction 36/88`, …). Cảnh báo "đây là tự báo cáo của tác giả, không phải kiểm chứng" là tự nhận thức đúng.
- Đối chiếu chéo `builtins.md`: **253/564 = 44%** ✓ tái tạo chính xác.

**§2.2** — B4 monkey-patch: đúng 6 file, đúng tên ✓. B3: `service-tier.ts` dùng `setSessionFastMode` **8 lần** ✓, khai báo ở dòng 109 ✓.

**§3.2** — tái tạo **chính xác tuyệt đối**: **1.268.737 ký tự / 323 file**, và 10 dòng top đầu khớp từng số. Cảnh báo "1,27 MB là cận trên, 323/603 = 54% mới là con số đáng tin" là đúng.

**§3.7** — `replaceTabs` 0 ✓ · `truncateToWidth` **2** ✓ (`look-at/render.ts`, `webfetch/webfetch/renderers.ts`) · `shortenPath` 0 ✓ · `PREVIEW_LIMITS` 0 ✓.

**Tôi thử bác bỏ mạnh hơn phép này và không được:** senpi có 32 builtin file khớp `sanitize`. Tôi mở ra — là `sanitizeTools`, `sanitizeAgentsContent`, `sanitizeReason`: **validate input, không phải sanitize text TUI**. Kết luận "senpi không có tầng sanitize này" **đứng vững**.

**§4.1** — import của `anthropic-subscription` khớp từng dòng ✓; `sdk-boundary.ts:24` ✓; `claude-agent-sdk` trong `bun.lock` của omp = **0** ✓; không có trong `package.json` ✓; `cursor.ts` của omp = **5.541 dòng** ✓.

**§5.2** — `registerFilesystemPolicy` rỗng ✓; `FilesystemPolicy` trong omp = 0 ✓; `approval.ts` 387 dòng ✓; `file-write-fallback.ts` 467 dòng ✓.

**§8.1** — `model_select`: **16 builtin** ✓ (đúng từng tên). Và omp thật sự **thiếu cả ba** setter mà bài nêu:

```bash
cd $OMP
for api in setSessionFastMode setSessionModel setSessionThinkingLevel; do
  printf "%-26s %s file\n" "$api" "$(git grep -l "$api" -- 'packages/*/src/*.ts' | wc -l | tr -d ' ')"
done
# cả ba = 0
```

**§0.4** — `classifyModel`: senpi **0** file ✓, omp **32** file (bài ghi "20+", đúng vì đó là cận dưới).

**§3.2 (phần so sánh)** — tôi thử bác bỏ bằng cách tìm prompt-ở-`.md` ở senpi ngoài cây builtin: `git ls-files 'packages/coding-agent/src/prompts/*.md' | wc -l` = **0**, và `with { type: "text" }` = **0** file. omp: 223 ✓. **Kết luận "senpi không có hệ prompt-ở-file" đúng, và đúng cả khi đo rộng hơn bài đo.**

---

## 5. CÒN LẠI: ba điều chỉnh nền tảng của đề — bài này có phá không?

**Không.**

1. **`gajae` là fork của dòng omp/pi** — bài không đụng tới.
2. **`pi` không có MCP, không có ACP** — bài không đụng tới.
3. **`chord` không phải cơ chế vòng đời extension** — bài không đụng tới.
4. **Đừng chép session layer của `pi`** — §7 **xác nhận lại đúng cả hai vế** bằng lệnh chạy được, và tôi đã chạy lại: đều khớp. Đây là phần bài làm tốt nhất về mặt an toàn.

---

## 6. KẾT LUẬN

**Phán quyết tổng:** bài viết **giữ được phần lõi, mất phần số**.

- **Kết luận chiến lược của bài vẫn đúng** và tôi không bác bỏ được: 6 builtin lõi-nhẹ chép được; `prompt-preset` / `permission-system` / `tool-pair-guard` phải viết lại; `anthropic-subscription` / `cursor-cli-oauth` / `gpt-apply-patch` / `compaction` không nên lấy; giữ nguyên session layer của omp; đừng mang chuỗi `OH-MY-OPENCODE` ở `compaction/prompts.ts:31` (tôi đã mở dòng 31, đúng).
- **Số thì đáng nghi ngờ ở 16 chỗ**, trong đó 3 chỗ sai đủ lớn để đảo chiều lập luận nếu ai đó dùng bảng đó ra quyết định: `private` 35→197 (A1), phép §3.1 14→13 (A2), cột "cái mất" 3.189→1.038 (A7).
- **Một khẳng định âm tính được "xác nhận" bằng lệnh cho ra 41 file** (B1). Đây là lỗi nguy hiểm nhất, vì "không có" là loại khẳng định dễ bị tin nhất.
- **13/40 builtin không có bất kỳ phép đo nào** mà bài xếp hạng như an toàn (B2), trong đó có `look-at` — hạng 2 của kế hoạch M5.

**Việc nên làm trước khi dùng `deep-risk.md` làm đầu vào cho M5:**

1. Sửa `§3.6`: 35 → **197**.
2. Sửa `§3.1`: 14 → **13**; bỏ `compaction/prompts.ts:292` khỏi khối in (hoặc ghi rõ nó đến bằng phép khác); "13/14" → **10/13**; "11 nhánh" → **10**.
3. Sửa `§3.1`: "33 file preset" → **38 file `.ts`, 31 mang tên model-id**.
4. Sửa `§2.2 B1`: 10 → **11** path; bỏ ✅ ở `capability/rule.ts` (không tồn tại) hoặc ghi "10/11 tồn tại".
5. Sửa `§4.5`/`§8.2`: 3.189 → **1.038** (nhóm 4) hoặc **3.089** (nhóm 5).
6. Sửa `§2.2 B2`: `setModel` 3 → **8**; nói rõ `\b` là word-boundary, không phải substring.
7. Sửa `§3.4`: xoá ghi chú "công bằng" về `pty.lazy.ts`/`content.lazy.ts` (một cái có `await import()` thật, một cái không tồn tại); "20 file `.lazy.ts`" → **4**.
8. Sửa `§3.8`: cột inline import 8 → **4**; thêm nhãn đơn vị cho các cột đếm.
9. Sửa `§4.3`: bỏ câu "lệnh không ra gì" — nó ra 41 file; thêm `beta/omo-local-update*.ts` (1.092 dòng) vào hiểm họa OMO.
10. Thêm vào `§9`: **13 builtin không có `changes.md`** ⇒ chưa từng được đo; `look-at` và `history-search` nằm trong nhóm đó.
11. Sửa đường dẫn extension API của omp ở `§8.1` → `packages/coding-agent/src/extensibility/extensions/`.
12. Bổ sung lệnh cho "không builtin nào ghi JSONL" ở `§7` (tôi đã đo: 9 file ghi, đều là credentials/token/trust, **không** phải session JSONL — kết luận đúng).

**Và điều bài nói đúng, không nên sửa:** cảnh báo `wc -l | tail -1`; toàn bộ §2.1; toàn bộ §3.2; §7 về JSONL; và việc tự thú ở §9 rằng §2.1 là tự báo cáo chứ không phải kiểm chứng.
