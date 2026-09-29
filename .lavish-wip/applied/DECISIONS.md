# QUYẾT ĐỊNH — một tài liệu, một đáp án

Bốn câu hỏi, bốn đáp án duy nhất. Mỗi đáp án dưới đây là câu trả lời **chính thức** cho mọi tài
liệu trong repo. Không tài liệu nào được tự viết đáp án riêng.

Đo trên `~/Projects/ultraworkers`, nhánh `milestone-1`, HEAD `6e8109d`, ngày 2026-09-28.

---

## durable

**Câu hỏi:** `durable` của `pi` — chép vào omp hay không?

**Đáp án (đúng chính xác, dán vào cả nơi):**

**SÁU package. `durable` KHÔNG chép trong đợt này.** Sáu package là `chord`, `pi-protocol`,
`pi-server`, `pi-client`, `pi-telemetry`, `pi-evals`.

Lý do (đo được, không phải suy luận): `durable` của `pi` là **package chết** — **0** package nào
ngoài nó import (`packages/agent/package.json` không có `pi-durable`; 4 hit `pi-durable` bên ngoài
`packages/durable/` đều là `README.md:33`, `package-lock.json`, `tsconfig.json` path và
`scripts/durable-browser-smoke-entry.ts` — **không cái nào là mã sản phẩm**). Nó là 63 file /
**21.093 dòng**. Tầng session thật sự chạy nằm ở `packages/agent/src/harness/session/jsonl/`, và cả
`pi` lẫn `senpi` ở đó đều **hard-fail** khi JSONL hỏng — còn omp đã có
`parseJsonlLenient` (`packages/utils/src/stream.ts:575`) + `#rewriteRequired`
(`packages/coding-agent/src/session/session-manager.ts:731`). Chép bất kỳ tầng session nào của
chúng vào omp là **lùi về sau**.

**Phạm vi cuối cùng cần ghi rõ:** `durable` bị loại **không phải vì thiếu giá trị, mà vì không
package nào trong `pi` import nó.** Mục 5 của M1B **được giữ lại làm tài liệu tham khảo** — nó là
nguồn duy nhất của `pi-ref/packages/durable/docs/pico-v5.md` (§5.4 Scheduler, §6 Submissions/Inbox,
§7 Hooks, §8 built-in tasks), tức năng lực task/scheduler mà omp chưa có. **Mục 5 KHÔNG phải
work item; không ai được làm theo các bước bên dưới nó.** Hệ quả phải nói thẳng: **lỗ hổng bằng
chứng ở M1 về nửa "document" đã được điền** — xem `MILESTONE_1_EXECUTION_PLAN.md:64`.

**Số phải dùng:** tổng file chép **169** (232 − 63), **không phải 165**. Bảng gốc cộng đúng:
62 + 63 + 30 + 29 + 19 + 17 + 12 = 232; bỏ hàng `durable` (63) còn **169**.

**Bằng chứng:**

```bash
# cây nguồn — chạy lại được, không cần tin báo cáo
cd ~/Projects/pi-ref
git ls-files 'packages/durable/*' | wc -l                                    # 63
git ls-files 'packages/durable/*' | xargs wc -l | tail -1                   # 21093
git grep -n "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
#   → README.md:33 · package-lock.json:738,5778
#     · scripts/durable-browser-smoke-entry.ts:1-4 · tsconfig.json:19-21   (0 mã sản phẩm)
git show HEAD:packages/agent/package.json | grep -c durable                  # 0

# cây đích — thay thế đã có sẵn
cd ~/Projects/ultraworkers
grep -n 'export function parseJsonlLenient' packages/utils/src/stream.ts     # :575
grep -n '#rewriteRequired = ' packages/coding-agent/src/session/session-manager.ts  # :731
ls packages/ | grep -x durable || echo "packages/durable chưa tồn tại"        # chưa tồn tại

# ba chỗ trong M1B còn trả lời ngược (đều là "bảy")
grep -n -E 'bảy package|7 package' MILESTONE_1B_EXECUTION_PLAN.md | wc -l     # 10
awk 'NR==2775' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR>=314 && NR<=316' MILESTONE_1B_EXECUTION_PLAN.md
```

Nguồn quyết định: `SENPI_FINDINGS.md:1641-1658` và `MILESTONE_1B_EXECUTION_PLAN.md:15-38`
(commit `756afaf`, 2026-09-28 17:11) — **sau** commit kiến trúc `1454dc0` (00:18) vốn mới nói
"chép cả bảy". Mốc sau ghi đè mốc trước.

**Cần xuất hiện ở:**

| File | Dòng | Việc |
|---|---|---|
| `MILESTONE_1B_EXECUTION_PLAN.md` | 3 | "bảy" → **"sáu"**; sáu tên + tổng **169** file |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 15-38 | Giữ nguyên mục *Điều chỉnh phạm vi*; thêm câu "áp cho **cả 6**" |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 1716 | Tiêu đề mục 5 → `## 5. durable — TÀI LIỆU THAM KHẢO, NGOÀI PHẠM VI` |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 1718 | "thứ 5 trong 7" → xoá |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 1750-1756 | Xoá khối "A/B/C" — **phương án A đã bị rút**; thay bằng đoạn "không chép package này" |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 1771-1800+ | Bảng *File cần chép* của mục 5 → ghi rõ là tham khảo, không phải danh sách việc |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 297-303 | Bảng *Thứ tự migrate*: **xoá hàng 5** (`pi-durable`), đánh lại 6→5, 7→6; thêm ghi chú dưới bảng |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 305-308 | Bỏ "1,2,3,4,5 đứng hết" → "1,2,3,4"; bỏ `pi-durable là package lớn nhất` |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 314-316 | `workspaces.catalog`: bỏ `@oh-my-pi/pi-durable`; "Bảy" → "**Sáu**" |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 1000 | `… → client → ~~durable~~ → telemetry → evals` → `chord → protocol → server → client → telemetry → evals` |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2720 | "Sáu package chép (chord, protocol, server, client, durable, telemetry)" → bỏ `durable`, sửa thành 5 + `evals` |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2770 | **Xoá hàng `\| durable \| Sáu điều kiện… \|`** khỏi bảng *Định nghĩa hoàn thành* |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2773 | `AGENTS.md (áp cho cả 7)` → `áp cho cả **6**`; glob `packages/{chord,protocol,server,client,telemetry,evals}/src` |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2775 | "cả **bảy** package" → "cả **sáu** package — `chord`, `protocol`, `server`, `client`, `telemetry`, `evals`"; bỏ vế `durable` trong danh sách cổng test |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 2779, 2780, 2781, 2783 | "bảy package" còn sót → sáu; bỏ `durable` khỏi danh sách chạy được |
| `MILESTONE_1B_EXECUTION_PLAN.md` | 608, 989, 1002, 1460, 1477, 2610, 2633, 2718 | "bảy" còn sót → "sáu" (mục 608 còn ghi "`durable` phụ thuộc nó" → bỏ) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 25 | "**Bảy** package omp chưa có" → "**Sáu**" |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 30 | **Xoá hàng `durable`** khỏi bảng; thêm hàng ghi chú cuối bảng trỏ về *Điều chỉnh phạm vi* của M1B |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 36 | Tổng `232` → `**169**` |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 41-44 | Xoá đoạn "Chép nó vào là đóng lỗ hổng" → thay bằng đoạn điều chỉnh 6 package |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 409 | "(7 package, 232 file)" → "(**6 package, 169 file**)" |
| `MILESTONE_1_EXECUTION_PLAN.md` | 64-75 | Giữ nguyên — đây **là** nơi đã điền lỗ hổng, không sửa |

---

## third-package

**Câu hỏi:** "Package `pi` thứ ba bị từ chối" ở ô *Chưa xác định* — nó là gì, và quyết định ra sao?

**Đáp án (đúng chính xác, dán vào cả nơi):**

Package thứ ba là **`chord`** — và quyết định là **CHÉP**, không phải từ chối. `chord` là package
thứ nhất trong bảng *Thứ tự migrate* của M1B, nằm trong sáu package của đợt này.

Lý do: quyết định kiến trúc commit `1454dc0` (2026-09-28 00:18) ghi thẳng vào message rằng *"M1's
'Không làm gì' currently records chord, durable and session-backends as waived, and that is now
wrong."* Cả ba dòng đó hết hiệu lực. `chord` là **tầng runtime composition** phục vụ
`server`/`client`, không phải cơ chế vòng đời extension — nó là cổng chai duy nhất của nửa đầu đồ
thị, không có nó thì `protocol`, `server`, `client` đều đứng hết.

**Ba ô trong bảng *Không làm gì* phải ghi đúng ba trạng thái khác nhau:**

| Package của `pi` | Quyết định hiện hành |
| --- | --- |
| **`chord`** | **CHÉP** — đây là package thứ ba từng ghi "Chưa xác định". Nằm trong sáu package của đợt này, vị trí 1 trong bảng *Thứ tự migrate*. |
| `durable` | **KHÔNG chép** — package chết, 0 file ngoài nó import. Xem quyết định `durable` ở trên. |
| `session-backends` | **Còn để ngỏ** — thứ duy nhất trong ba cái chưa có quyết định. Thay thế hiện tại chỉ được kiểm **theo tên và bề mặt**, chưa chứng minh tương đương hành vi; W16 mới ép chúng trả lời cùng một bộ câu hỏi. |

**Bằng chứng:**

```bash
git log -1 --format='%H%n%ad%n%B' 1454dc0 | head -20
#   → commit 1454dc0a064f19ae9feac963791548282698423f
#     2026-09-28 00:18:29 +0700
#     "M1's 'Không làm gì' currently records chord, durable and
#      session-backends as waived, and that is now wrong."

# M1 tự mâu thuẫn với chính nó — dòng 56 vs dòng 3884
awk 'NR==56'  MILESTONE_1_EXECUTION_PLAN.md   # *(package thứ ba)* … Chưa xác định
awk 'NR==3884' MILESTONE_1_EXECUTION_PLAN.md  # chord, durable, session-backends bị loại khỏi M1

# chord CÓ thật trong danh sách chép
awk 'NR==297' MILESTONE_1B_EXECUTION_PLAN.md  # | 1 | @oh-my-pi/chord | packages/chord |
git log --oneline -S '*(package thứ ba)*' -- MILESTONE_1_EXECUTION_PLAN.md
#   → 33d6e33  (ô trống có từ bản đầu, chưa từng được lấp)
```

**Cần xuất hiện ở:**

| File | Dòng | Việc |
|---|---|---|
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 471-477 | Thay cả mục *Không làm gì* bằng bảng ba dòng ở trên (tiêu đề đổi thành *Không làm gì — ĐÃ BỊ QUYẾT ĐỊNH KIẾN TRÚC ĐẢO NGƯỢC (2026-09-28, commit `1454dc0`)*) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 588 | **Xoá hàng 5** khỏi bảng *Quyết định cần chốt trước khi code*; thay bằng ghi chú dưới bảng: *(Hàng "package thứ ba bị từ chối" đã bị đóng bởi `1454dc0`: package thứ ba là `chord`, và quyết định là **chép**.)* |
| `MILESTONE_1_EXECUTION_PLAN.md` | 48-56 | Thay cả mục *Không làm gì* bằng bảng ba dòng ở trên |
| `MILESTONE_1_EXECUTION_PLAN.md` | 3882-3884 | → *"`chord` **không còn bị loại** — nó được chép (vị trí 1 trong M1B). `durable` **không chép** — package chết. `session-backends` vẫn là thứ duy nhất chưa có quyết định."* |
| `MILESTONE_1_EXECUTION_PLAN.md` | 55 | Hàng `durable (một phần)` → `durable` + trạng thái **KHÔNG chép** (bỏ chữ "một phần") |

---

## m5-order

**Câu hỏi:** Phụ thuộc thật của M5 là gì?

**Đáp án (đúng chính xác, dán vào cả nơi):**

**M5 chỉ phụ thuộc cứng `M2` — không phụ thuộc M3, không phụ thuộc M4.** Chạy M5 song song với
M3/M4 ngay khi M2 merge.

M5 **không** phải điều kiện tiên quyết của M3 hay M4. Kiểm chứng: `grep -c -E
'ultraworkers|APP_NAME|thương hiệu|rebrand'` trả **1** hit ở M3 (dòng 690 — một đường dẫn
filesystem, `cd /Users/.../ultraworkers`) và **2** hit ở M4 (dòng 1629-1630 — hai đường dẫn
`.lavish-wip/`). **Không milestone nào giả định tên thương hiệu.** Câu "M5 là tiền đề của M3/M4"
trong M1B/M5 là sai.

Tiền đề thật của M5 nằm ở `MILESTONE_5_EXECUTION_PLAN.md:172`: *"**M2 phải đã merge**: bảng
`legacy-pi-compat` đóng băng, exports map chốt trên `main`"* — W4, W5, W8a, W13 đều phụ thuộc.

**Hai điều kiện có lead time dài nằm ngoài chuỗi phụ thuộc và phải mở sớm, không thuộc milestone
nào:** (1) `scripts/rename/keep-list.txt` phải có trên `main` và được **một người duyệt khác người
viết** — nó chặn nguyên sóng 3; (2) scope npm `@ultraworkers` phải tồn tại — nằm ngoài repo.

M5 **có** phụ thuộc M1: nó đổi tên thương hiệu của package mà M1 vừa dựng. Cột *Phụ thuộc* của hàng
M5 ghi `M1, M2`.

**Bằng chứng:**

```bash
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 1
grep -n  -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 690: cd /Users/…/ultraworkers
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 2
grep -n  -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 1629,1630: .lavish-wip/
awk 'NR==172' MILESTONE_5_EXECUTION_PLAN.md    # "M2 phải đã merge: bảng legacy-pi-compat đóng băng…"
ls -d scripts/rename 2>/dev/null || echo "scripts/rename chưa tồn tại"   # chưa tồn tại
```

Cả ba mệnh đề của báo cáo về câu hỏi này đều **đúng về kết luận** (M5 không cần M3/M4; tiền đề
thật là M2; hai điều kiện lead-time dài nằm ngoài chuỗi). Báo cáo chỉ dùng từ *"về mặt kỹ thuật"*
nơi cần nói thẳng **không có quan hệ phụ thuộc nào** — xem `## Ghi chú`.

**Cần xuất hiện ở:**

| File | Dòng | Việc |
|---|---|---|
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 280 | Cột *Phụ thuộc* của hàng M5: `M1–M4` → **`M1, M2`** |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 288-289 | Thay đoạn "M5 không cần M3 hay M4" bằng đoạn đáp án ở trên (kèm hai điều kiện lead-time dài) |
| `COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md` | 285 | Chuỗi phụ thuộc → `M1 → M1B → M2 → {M3, M4} → M5 → M6`, kèm câu "M5 chạy song song với M3/M4" |
| `MILESTONE_5_EXECUTION_PLAN.md` | 3 | "Nó đứng sau M1 … và là **điều kiện tiên quyết thực tế cho M3 và M4**, vì cả hai đều giả định tên thương hiệu đã ổn định" → "Nó **chỉ phụ thuộc cứng M2**; **không** phải tiền đề của M3 hay M4 — M3 và M4 không có tham chiếu nào tới thương hiệu. Hai điều kiện lead-time dài của nó nên mở song song với M3/M4." |
| `MILESTONE_5_EXECUTION_PLAN.md` | 168-172 | Giữ nguyên — đây **là** nơi tiền đề thật nằm, không sửa |

---

## wi-4b

**Câu hỏi:** `WI-4b` còn là một work item riêng không, hay đã được hấp thụ vào `WI-4`?

**Đáp án (đúng chính xác, dán vào cả nơi):**

**`WI-4b` KHÔNG tồn tại như một work item riêng. Nó đã được hấp thụ vào `WI-4`.**

Phần việc duy nhất mà `WI-4b` từng giữ — chú thích kiểu `Readonly<Record<string, ToolRenderer>>` —
**đã nằm sẵn trong thân `WI-4`**: tiêu đề mục là `## WI-4. Đóng backdoor toolRenderers — Object.freeze
+ Readonly ở tầng kiểu`, và **bước 2** của nó (`MILESTONE_2_EXECUTION_PLAN.md:1512`) đã ra lệnh
thay đúng dòng khai báo đó. Không có gì để hấp thụ nữa — việc dở dang không phải việc, nó là
**một ô trống trong bảng sóng M2** mà 13 chỗ ở M4 đã trỏ tới.

M4 được phép giữ **một** con trỏ, và con trỏ đó trỏ tới `WI-4` (không phải `WI-4b`).

**Bằng chứng:**

```bash
awk 'NR==1474' MILESTONE_2_EXECUTION_PLAN.md
#   ## WI-4. Đóng backdoor `toolRenderers` — `Object.freeze` + `Readonly` ở tầng kiểu   ← đã có Readonly
awk 'NR==1512' MILESTONE_2_EXECUTION_PLAN.md | cut -c1-260
#   2. Áp dụng thay đổi khai báo. Neo: packages/tui/src/tools/index.ts:35. Thay
#      `Record<string, ToolRenderer> = {` bằng `Readonly<Record<string, ToolRenderer>> = Object.freeze<…>({`
awk 'NR>=79 && NR<=177' MILESTONE_2_EXECUTION_PLAN.md | grep -c 'WI-4b'   # 0 — không có trong bảng sóng
grep -c 'WI-4b' MILESTONE_4_EXECUTION_PLAN.md                               # 13
awk 'NR==254'  MILESTONE_4_EXECUTION_PLAN.md   # "WI-4b chưa tồn tại trong danh sách work item của M2"
awk 'NR==4307' MILESTONE_2_EXECUTION_PLAN.md   # câu hỏi đang mở: "land trong WI-4, đóng WI-4b là already done"
```

M2:4307 đã có sẵn mặc định đúng (`land trong WI-4, đóng WI-4b là "already done"`) và **không
chặn** gì. Câu trả lời ở trên chỉ làm nó thành sự thật.

**Cần xuất hiện ở:**

| File | Dòng | Việc |
|---|---|---|
| `MILESTONE_2_EXECUTION_PLAN.md` | 1474, 1512 | **Không sửa** — phần `Readonly` đã đúng ở đây |
| `MILESTONE_2_EXECUTION_PLAN.md` | 1632 | Câu hỏi "…hay chờ WI-4b?" → đánh dấu **ĐÃ CHỐT: `Readonly` nằm trong WI-4; WI-4b không tồn tại** |
| `MILESTONE_2_EXECUTION_PLAN.md` | 4307 | Hàng bảng câu hỏi → chuyển sang trạng thái đã chốt, bỏ khỏi nhóm "chưa có mặc định" |
| `MILESTONE_2_EXECUTION_PLAN.md` | 4350 | Cùng |
| `MILESTONE_4_EXECUTION_PLAN.md` | 217, 254, 278, 329, 367, 379, 414, 426, 1157, 1307, 1308, 1332, 1927 | Thay **13/13** chỗ `WI-4b` bằng `WI-4` (phần kiểu), và bỏ mọi câu "chưa tồn tại"/"chưa có mặc định" về nó |

---

## Ghi chú

### Đã chạy lệnh gì để quyết định

Không dùng lại con số của báo cáo. Mọi mệnh đề dưới đây tôi tự chạy lại:

```bash
git rev-parse HEAD                                    # 6e8109d0a8e…
git log -1 --format='%B' 1454dc0                      # đọc nguyên văn quyết định kiến trúc
git merge-base --is-ancestor a43749d 756afaf          # a43749d là tiền nhân của 756afaf → ĐÚNG
cd ~/Projects/pi-ref && git ls-files 'packages/durable/*' | wc -l            # 63
cd ~/Projects/pi-ref && git ls-files 'packages/durable/*' | xargs wc -l|tail -1  # 21093
cd ~/Projects/pi-ref && git grep -n "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
cd ~/Projects/pi-ref && git show HEAD:packages/agent/package.json | grep -c durable   # 0
awk 'NR>=25 && NR<=50'  COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR==297'  MILESTONE_1B_EXECUTION_PLAN.md ; awk 'NR>=314 && NR<=316' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR==1000' MILESTONE_1B_EXECUTION_PLAN.md ; awk 'NR>=2760 && NR<=2790' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR==1716' MILESTONE_1B_EXECUTION_PLAN.md ; awk 'NR==1750' MILESTONE_1B_EXECUTION_PLAN.md
awk 'NR==64'   MILESTONE_1_EXECUTION_PLAN.md   ; awk 'NR==56' MILESTONE_1_EXECUTION_PLAN.md
awk 'NR==3884' MILESTONE_1_EXECUTION_PLAN.md
awk 'NR>=469 && NR<=476' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md ; awk 'NR==588' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR>=255 && NR<=295' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md ; awk 'NR==409' COMPREHENSIVE_PLAN_FOR_OMP_UPGRADE.md
awk 'NR==3' MILESTONE_5_EXECUTION_PLAN.md ; awk 'NR==172' MILESTONE_5_EXECUTION_PLAN.md
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_3_EXECUTION_PLAN.md   # 1
grep -c -E 'ultraworkers|APP_NAME|thương hiệu|rebrand' MILESTONE_4_EXECUTION_PLAN.md   # 2
ls -d scripts/rename 2>/dev/null || echo ABSENT
grep -n 'WI-4b' MILESTONE_4_EXECUTION_PLAN.md | wc -l                                   # 13
awk 'NR==1474' MILESTONE_2_EXECUTION_PLAN.md ; awk 'NR==1512' MILESTONE_2_EXECUTION_PLAN.md
awk 'NR>=79 && NR<=177' MILESTONE_2_EXECUTION_PLAN.md | grep -c 'WI-4b'               # 0
awk 'NR==4307' MILESTONE_2_EXECUTION_PLAN.md ; awk 'NR==254' MILESTONE_4_EXECUTION_PLAN.md
```

**Không chạy:** `bun run check:ts`, `bun test`, build native addon. Mọi phán đoán ở đây là về **văn
bản và cây**, không phải về hành vi chạy được. Riêng kết luận "omp đã có tầng chịu lỗi mạnh hơn"
mới chỉ được xác nhận bằng **đọc mã** (`parseJsonlLenient` + `#rewriteRequired` tồn tại), chưa
bằng một lần chạy.

### Ba chỗ báo cáo SAI về nguyên nhân

**1. `durable` không phải câu trả lời thứ ba — nó là câu trả lời thứ TƯ, và câu thứ tư mới là
câu mới nhất.**

Báo cáo nói có ba câu trả lời (7 ở phần thân, 6 ở mục điều chỉnh) và bảo "chỉ câu đầu mới đúng".
Nhưng `git log -S` cho ra **hai** mốc quyết định, không phải một:

```
1454dc0  2026-09-28 00:18   quyết định kiến trúc: chép CẢ BẢY, gồm durable
a43749d  2026-09-28 12:31   M1B §5: "phương án A (mặc định đề xuất): chép durable TRỪ tầng lưu"
756afaf  2026-09-28 17:11   M1B Điều chỉnh phạm vi: 7 → 6, durable ra khỏi phạm vi
6e8109d  2026-09-28 17:28   HEAD
```

Câu trả lời thứ tư là **phương án A** ở `MILESTONE_1B_EXECUTION_PLAN.md:1750`: *"chép `durable`
trừ tầng lưu, và giữ tầng lưu của omp"* — đánh dấu là **mặc định đề xuất**, kèm bảng *File cần
chép* 30+ dòng ở 1771-1800 trong đó `src/storage/jsonl/storage.ts` được ghi **"BỎ (phương án
A)"**. Đây **không phải** "văn bản cũ bị mục điều chỉnh ghi đè" — nó là một quyết định còn sống,
mới hơn `1454dc0`, và **cũ hơn** `756afaf`.

`git merge-base --is-ancestor a43749d 756afaf` trả về đúng: `756afaf` mới hơn và **bao trọn**
`a43749d`. Nên `756afaf` (6 package) là câu trả lời đúng — nhưng báo cáo phải nói rõ nó **đảo
ngược phương án A**, chứ không gọi mục 5 là "văn bản cũ". Khác biệt này quan trọng: nếu chỉ ghi
"mọi câu còn lại là văn bản cũ", người đọc sẽ giữ lại bảng 30 dòng ở mục 5 và làm theo — đúng
cái lỗi mà quyết định này sinh ra để chặn.

**Phần đúng:** lập luận "package chết" là chuẩn, và nó kiểm được (0 import ngoài nó). **Phần
sai:** đếm số câu trả lời, và bỏ qua mốc thứ ba.

**2. Phép trừ `232 → 165` trong bản sửa đề xuất là sai số học.**

Báo cáo (dòng 163) viết *"tổng `232` → `165 file`"*. Bảng gốc cộng đúng: 62 + 63 + 30 + 29 + 19 +
17 + 12 = **232**. Bỏ hàng `durable` (63) còn **169**. Tôi đã chạy lại: `232-63 = 169`. Con số
đúng cho bản sửa là **169**, không phải 165 — nếu ai dán nguyên văn bản sửa của báo cáo, bảng sẽ
mất 4 file mà không ai biết vì sao.

**3. "Ô trống ghi *Chưa xác định*" — mô tả đúng, nhưng bỏ sót rằng M1 tự mâu thuẫn với chính nó
ở hai dòng cách nhau 3.828 dòng.**

Báo cáo nói đúng rằng `1454dc0` đã chốt package thứ ba là `chord`, và đúng rằng quyết định là
**chép**. Nhưng nó không nói rằng ô trống ấy **chưa từng** được lấp — `git log -S '*(package thứ
ba)*'` trả về đúng **một** commit, `33d6e33`, tức nó sinh ra là trống và chết ở trạng thái đó suốt
đời tài liệu. Cũng vậy, mâu thuẫn nội tại của M1 (dòng 56 vs dòng 3884) là chi tiết báo cáo có
nhắc nhưng không nâng thành lý do: đó mới là bằng chứng cho thấy đây là lỗi **"quyết định ghi ở
đúng một chỗ, rồi đọc ở chỗ khác"** chứ không phải một ô bị bỏ trống.

### Một chỗ báo cáo ĐÚNG hoàn toàn

Câu chẩn đoán ở mục *Một bài học chung* là đúng, và tôi xác nhận nó bằng chính bốn quyết định
này: cả bốn đều là "một sự thật mới đến muộn được ghi vào mục đầu file đúng một lần, thay vì
lan ra tới những chỗ kỹ sư đọc để quyết định". Riêng `durable` có **tám** chỗ phải cùng một câu
trả lời ở ba tài liệu — nhiều hơn bảy chỗ báo cáo liệt kê, vì mục 5 của M1B còn có khối phương
án A mà báo cáo không tính.

### Ngoài phạm vi bốn quyết định này

Bốn blocking còn lại trong báo cáo (W8 ở M1, bảng milestone thiếu M1B/M7 ở master, và các major
#1-#9) **không nằm trong bốn câu hỏi này và tôi không quyết ở đây**. Riêng dòng 285 của master
(`M1 → M1B → M2 → {M3, M4} → M5 → M6`) trong mục `m5-order` chỉ được sửa **vì** nó là nơi cột
*Phụ thuộc* của hàng M5 được đọc; việc thêm hai hàng M1B/M7 vào bảng đó là việc của blocking
"bảng điều hướng bỏ sót hai cả kế hoạch", chưa quyết ở file này.

Tôi không sửa bất kỳ tài liệu kế hoạch nào — file này là toàn bộ đầu ra.
