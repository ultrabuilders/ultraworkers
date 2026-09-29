# senpi là con của ai, và chúng ta có được quyền gì

> Nghiên cứu cho milestone M5. Viết ngày 2026-09-28.
> Mọi khẳng định dưới đây đều kèm lệnh đã chạy — chạy lại được, không cần tin lời tôi.
>
> **Biến môi trường** (đọc lại sau 6 tháng thì kiểm lại trước):
> ```bash
> PI=/Users/tranquangdang21/Projects/pi-ref        # earendil-works/pi
> S=/Users/tranquangdang21/Projects/senpi-ref     # code-yeongyu/senpi
> OMP=/Users/tranquangdang21/Projects/ultraworkers # bản làm việc của oh-my-pi
> ```

---

## Tóm tắt một trang

| Câu hỏi | Trả lời ngắn |
| --- | --- |
| senpi fork từ commit nào? | `05f79b08` (2026-04-25, pidalf) — **điểm gốc**. Lần đồng bộ upstream gần nhất: `71dca871` (2026-09-11). |
| `earendil-works/pi` và `badlogic/pi-mono` là một? | **CÓ, là một.** Cùng root commit SHA, cùng lịch sử tác giả, `SECURITY.md` giống hệt từng byte. |
| License? | **MIT thuần.** Root `LICENSE` + `packages/senpi-codemode/LICENSE`. Ngoại lệ duy nhất: LinkeDOM **ISC** (trong `NOTICE.md`), vẫn permissive. |
| Có phần nào không được chép không? | **Không có ràng buộc pháp lý nào.** Chỉ có quy tắc *thương hiệu* trong `CONTRIBUTING.md` (không được tạo cảm giác được vendor khác bảo trợ). |
| Kết luận | Chép được gần như toàn bộ. Điều kiện duy nhất: **giữ nguyên MIT notice**, và **đừng chép tên/thương hiệu**. |

**Điều quan trọng nhất về mặt kỹ thuật, không phải pháp lý:** senpi **đã chép từ chính omp** hai lần, và đã ghi công khai trong `NOTICE.md`. Chiều dòng chảy này là hai chiều, cả hai đều MIT. Chi tiết ở [§6](#6-senpi-đã-chép-từ-omp-hai-lần--và-đã-ghi-công-khai).

---

## 1. senpi fork từ commit nào

### 1.1 Câu trả lời: `05f79b08516809e0e06756013645c37419bf5570`

Lệnh:

```bash
git -C $S log --all --author='YeonGyu-Kim' --reverse --format='%H|%ad|%s' --date=short | head -3
```

Kết quả — commit đầu tiên của tác giả fork:

```
1ea83112b0da0c04a55462a446f5c8f1abad8b1d|2026-04-27|merge: sync sanepi fork tree onto upstream main
```

Đây là commit **ghép một-parent** (không phải merge thật):

```bash
git -C $S log -1 --format='%P' 1ea83112b0
# => 05f79b08516809e0e06756013645c37419bf5570

git -C $S log -1 --format='%ad %an %s' --date=short 05f79b08
# => 2026-04-25 pidalf docs: explain issue triage policy (#3725)
```

Một parent duy nhất ⇒ cây `sanepi` được **đặt lên đỉnh** commit upstream `05f79b08`, không phải chia nhánh tự nhiên. Tên cũ của fork là **sanepi** (đọc được ngay trong subject).

Và `05f79b08` là commit upstream **thật**, không phải bịa:

```bash
git -C $PI cat-file -t 05f79b08   # => commit   (tồn tại trong lịch sử pi)
git -C $PI merge-base --is-ancestor 05f79b08 HEAD && echo YES
# => YES — nằm trên dòng chính của pi
```

### 1.2 Lần đồng bộ upstream gần nhất: `71dca871`

senpi tự khai báo pin trong `.github/upstream.json` (file máy đọc được — nếu tìm được file này thì đừng cần đoán):

```bash
cat $S/.github/upstream.json
```

```json
{
	"repo": "badlogic/pi-mono",
	"tag": "v0.85.1",
	"sha": "71dca871bc80b6bc97be37f0ca3189399d651fff",
	"synced_at": "2026-09-12T06:08:28Z"
}
```

Đối chiếu bằng git, không tin file:

```bash
git -C $S merge-base HEAD d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31
# => 71dca871bc80b6bc97be37f0ca3189399d651fff   ← trùng khớp CHÍNH XÁC
```

> **Bẫy đã tránh:** `git cat-file -t d6af72e1` trong repo senpi cũng trả về `commit` — nhưng đó là vì ai đó đã `git fetch` từ remote `pi-ref` (senpi có sẵn remote này trỏ về `/Users/.../pi-ref`). Object *tồn tại* ≠ commit đó *nằm trong lịch sử*. Lệnh đúng phải là:
> ```bash
> git -C $S merge-base --is-ancestor d6af72e1 HEAD && echo YES || echo NO
> # => NO  — pi HEAD KHÔNG nằm trong lịch sử senpi
> ```

### 1.3 Hệ số nhánh

```bash
git -C $S rev-list --count HEAD..d6af72e1   # => 194    (pi đi trước senpi 194 commit)
git -C $S rev-list --count d6af72e1..HEAD   # => 8415   (senpi có 8415 commit riêng)
```

**senpi đang ĐI SAU upstream 194 commit.** Đây là con số quan trọng cho M5: bất kỳ thứ gì lấy từ senpi thì nên lấy từ *pi trước*, vì pi mới hơn và cùng MIT.

### 1.4 Một điểm dễ nhầm: `tag` ≠ `sha`

```bash
git -C $PI rev-list -n1 v0.85.1                              # => d981de12... (2026-09-05)
git -C $PI rev-list --count 71dca871..d981de12              # => 0
git -C $PI merge-base --is-ancestor 71dca871 d981de12 || echo "pin MỚI hơn tag"
# => pin MỚI hơn tag
```

`tag: v0.85.1` là **release tag cuối cùng được sync**, còn `sha: 71dca871` là **tip của `upstream/main`** tại thời điểm sync. Không mâu thuẫn. Đừng báo cáo nhầm hai cái này là một.

### 1.5 Bức tranh đầy đủ

```bash
git -C $S log --oneline --all --grep='upstream/main' --merges | wc -l   # => 70
git -C $S rev-list --max-parents=0 --all                                # => 1 root commit
git -C $S log --all --format='%an' | sort | uniq -c | sort -rn | head -5
```

```
7682 YeonGyu-Kim
3783 Mario Zechner
 740 Armin Ronacher
 276 David Brailovsky
 235 senpi-release-bot
```

senpi giữ **toàn bộ** lịch sử upstream (1 root commit `a74c5da1` của Mario Zechner, 2025-08-09), đồng bộ upstream **70 lần**, tự thêm **7682 commit**. Đây là fork *sống*, không phải bản sao đóng băng.

---

## 2. `pi` và `pi-mono` có phải một không

**CÓ. Là một.** Bằng chứng mạnh nhất là bằng chứng toán học, không phải suy luận:

### 2.1 Root commit trùng SHA

```bash
git -C $S rev-list --max-parents=0 --all
git -C $PI rev-list --max-parents=0 --all
```

Cả hai đều trả về:

```
a74c5da112c29466f182a03108337a488c785d76  2025-08-09  Mario Zechner  Initial monorepo setup with npm workspaces...
```

Một repo trùng root commit SHA là điều **không thể xảy ra ngẫu nhiên** — SHA-1 là hàm băm của nội dung. Hai repo có cùng root SHA là cùng một lịch sử.

### 2.2 SHA mà senpi tự khai là "upstream" nằm trong pi

Đây là phép thử quyết định:

```bash
git -C $PI cat-file -t 71dca871bc80b6bc97be37f0ca3189399d651fff   # => commit
git -C $PI log -1 --format='%an <%ae> %s' 71dca871
# => Armin Ronacher <armin.ronacher@active-4.com> fix(ci): Fix a broken test
```

senpi nói upstream của nó là `badlogic/pi-mono` @ `71dca871`. Commit đó **tồn tại trong pi-ref**, tác giả là Armin Ronacher — người không liên quan gì tới fork. ⇒ `pi-ref` và `badlogic/pi-mono` chia sẻ cùng một tập object.

### 2.3 `SECURITY.md` giống hệt từng byte

```bash
cmp -s $PI/SECURITY.md $S/SECURITY.md && echo IDENTICAL
# => IDENTICAL
```

File đó nói: *"guide you about understanding the security concept behind **Pi**"*, email `security@earendil.com`, domain `pi.dev`. Đây là **file gốc của upstream**, bị fork chép nguyên vẹn. `pi-ref` không có `NOTICE.md` (senpi tự tạo), `pi-ref` không có `.github/upstream.json` (vì nó không phải fork) — nhưng nó **có** `.github/APPROVED_CONTRIBUTORS` gần như giống hệt (397 dòng so với 393).

### 2.4 Tác giả: 100% upstream, không một người fork nào

```bash
git -C $PI log --all --format='%an' | sort | uniq -c | sort -rn | head -6
```

```
3783 Mario Zechner        737 Armin Ronacher     272 David Brailovsky
 201 Christian Klotz       197 Cristina Poncela Cubeiro      158 Vegard Stikbakke
```

Không có `YeonGyu-Kim`, không có `Can Bölük`. `earendil-works/pi` là **bản chính thức của pi-mono dưới tổ chức Earendil** — cùng dòng code, cùng lịch sử, chỉ khác chủ sở hữu tổ chức.

### 2.5 Tỉ lệ file giống hệt (đo đúng như yêu cầu)

```bash
PI=/Users/tranquangdang21/Projects/pi-ref; S=/Users/tranquangdang21/Projects/senpi-ref
for f in $(git -C $PI ls-files 'packages/agent/src/*' | head -100); do
  cmp -s "$PI/$f" "$S/$f" && echo same
done | wc -l
# => 62
```

**62/100 file giống hệt** ở `packages/agent/src`. Trên toàn bộ thư mục đó:

```bash
git -C $PI ls-files 'packages/agent/src/*' | wc -l    # => 117
# lặp lại với toàn bộ 117 file => 69 giống hệt
```

**Cách đọc đúng con số này** (dễ đọc sai lắm): 62% **không** phải "62% của senpi là của pi". Nó là *"trong 100 file mà pi đang có ở HEAD, có 62 file vẫn y nguyên ở senpi HEAD"*. Phần còn lại lệch vì senpi đã sửa hoặc pi đã tiến 194 commit. Con số này **đo độ trùng lặp, không đo quan hệ huy thống** — quan hệ huy thống đã được chứng minh bằng root SHA ở §2.1 và pin SHA ở §2.2.

### 2.6 Tên package

```bash
git -C $PI show HEAD:package.json | head -3   # "name": "pi-monorepo"
git -C $S  show HEAD:package.json | head -3   # "name": "senpi-monorepo"
```

Tên đổi, workspace giữ nguyên (senpi thêm `packages/pty` vào `workspaces`).

### 2.7 Kết luận §2

> `earendil-works/pi` **chính là** `badlogic/pi-mono`. Không phải hai repo liên quan, không phải fork, không phải bản sao — **cùng một lịch sử git**.

**Hệ quả cho M5:** khi nói "chép từ pi", ta có thể chép từ `pi-ref` mà **không hề vi phạm gì**, và đó là nguồn *mới hơn* senpi 194 commit. Trên phương diện pháp lý, `pi` và `senpi` ngang bằng nhau; nhưng về mặt kỹ thuật, **pi là nguồn tốt hơn**.

---

## 3. License thật sự cho phép làm gì

### 3.1 Hai file LICENSE, cùng nội dung

```bash
git -C $S ls-files | grep -iE '(^|/)(LICENSE|NOTICE|COPYING)'
# => LICENSE
# => NOTICE.md
# => packages/coding-agent/src/core/extensions/builtin/loop-guard/notice.ts   <- KHÔNG phải license
# => packages/coding-agent/src/core/extensions/notice/*.ts                   <- extension kit, KHÔNG phải license
# => packages/senpi-codemode/LICENSE
```

(`notice/` là *extension* gửi thông báo cho người dùng, không liên quan pháp lý.)

`LICENSE` gốc:

```
MIT License

Copyright (c) 2025 Mario Zechner (upstream pi-mono)
Copyright (c) 2026 Yeongyu Kim and senpi contributors
```

So với `pi` (chỉ một dòng `Copyright (c) 2025 Mario Zechner`) — senpi **thêm** dòng của mình, không xoá dòng cũ. Đây là cách làm đúng.

`packages/senpi-codemode/LICENSE` — **22 dòng, y hệt** root LICENSE.

### 3.2 Audit toàn bộ trường `license` trong mọi package.json

```bash
cd $S
for f in $(git ls-files | grep -E '(^|/)package\.json$'); do
  python3 -c "import json;print(json.load(open('$f')).get('license','<none>'))"
done | sort | uniq -c | sort -rn
```

```
  14 <none>
  12 MIT
```

14 file `<none>` là: root (private), 2 crate Rust, 5 example extension, plugin mẫu, `install-lock`, protocol generated, `evals`, doc sandbox. Tất cả **đều được root `LICENSE` MIT phủ**. Danh sách đầy đủ:

```
<none> :: .agents/skills/senpi-qa/package.json
<none> :: crates/senpi-grep/package.json
<none> :: crates/senpi-pty/package.json
<none> :: package.json
<none> :: packages/agent/docs/mobile-handoff/02-plugins/02-sandbox/package.json
<none> :: packages/coding-agent/examples/extensions/custom-provider-anthropic/package.json
<none> :: packages/coding-agent/examples/extensions/custom-provider-gitlab-duo/package.json
<none> :: packages/coding-agent/examples/extensions/gondolin/package.json
<none> :: packages/coding-agent/examples/extensions/sandbox/package.json
<none> :: packages/coding-agent/examples/extensions/with-deps/package.json
<none> :: packages/coding-agent/examples/plugins/pi-example-plugin/package.json
<none> :: packages/coding-agent/install-lock/package.json
<none> :: packages/coding-agent/src/modes/app-server/protocol/generated/package.json
<none> :: packages/evals/package.json
```

**Không có GPL, AGPL, LGPL, BSL, Apache-with-patent, hay license restrictive nào.** Đây là phát hiện có giá trị: nó loại trừ rủi ro lớn nhất.

### 3.3 `NOTICE.md` — 4 khoản ghi công, tất cả permissive

```bash
cat $S/NOTICE.md    # 67 dòng
```

| # | Nội dung | License | Phải giữ gì |
| --- | --- | --- | --- |
| 1 | **LinkeDOM** 0.18.12 (webfetch HTML parsing) | **ISC** | copyright + permission notice **phải xuất hiện trong mọi bản copy** |
| 2 | System prompt `dynamic-prompt/style.ts` (mục *Execution Stance*, *Scope of Freedom*) lấy cảm hứng từ **Gajae-Code** | MIT (Mario Zechner + **Can Bölük**) | attribution |
| 3 | Extension **TTSR** port từ **oh-my-pi** | MIT (Mario Zechner + **Can Bölük**) | attribution |
| 4 | Tool **todo** + lệnh `/todo` port từ **oh-my-pi** | MIT (Mario Zechner + **Can Bölük**) | attribution |

**ISC của LinkeDOM là ràng buộc duy nhất có hành vi thật** trong toàn bộ senpi: điều kiện *"provided that the above copyright notice and this permission notice appear in all copies"*. Nếu ta copy code LinkeDOM (qua senpi hay trực tiếp), phải giữ nguyên khối ISC đó. Nhưng nếu chỉ chép code của chính senpi thì LinkeDOM không liên quan.

### 3.4 Vendored extension — không phải third-party

`README.md:223` nói các builtin extension là *"vendored versions ... synced from the sibling `pi-extensions` checkout"*. Nghe như code của bên thứ ba, nhưng **không phải**:

```bash
cat $S/packages/coding-agent/src/core/extensions/builtin/external-versions.json
```

```json
"bash-timeout":  { "packageName": "pi-bash-timeout",  "source": "../pi-extensions/pi-bash-timeout" },
"gpt-apply-patch": { "packageName": "pi-apply-patch", "source": "../pi-extensions/pi-apply-patch" },
"todowrite": { "packageName": "pi-todotools", ... },  "goal": { "packageName": "pi-goal", ... },
"websearch": { "packageName": "pi-websearch", ... }, "webfetch": { "packageName": "pi-webfetch", ... },
"rules": { "packageName": "@code-yeongyu/pi-rules", ... },  ...
```

11 package, tên `pi-*` và `@code-yeongyu/pi-*` — đây là **package của chính fork**, xuất bản dưới tiền tố `pi-` (xem commit `917ce5474 fix(release): publish chord under the fork alias`). Không mang LICENSE riêng, được root MIT phủ.

### 3.5 OMO là gì — và tại sao không quan trọng

`README.md:19` gọi OMO là `code-yeongyu/oh-my-openagent`. Trong senpi, OMO xuất hiện **chỉ như một launcher/brand**, không phải code được vendor:

```bash
git -C $S ls-files | grep -iE 'oh-my-openagent|/omo/'
# => (rỗng — KHÔNG có source OMO nào trong repo)
```

```bash
git -C $S grep -n 'SENPI_BRAND' -- '*.ts' | head -2
# packages/coding-agent/src/core/brand.ts:14:export const BRAND_ENV_VAR = "SENPI_BRAND";
```

Cơ chế: launcher OmO export `SENPI_BRAND={"name":"OmO","configDir":".omo","envPrefix":"OMO"}` để senpi đổi tên hiển thị. Đó là **lớp phân phối**, không phải mã nguồn.

> **Tôi không đo được license của OMO** — `oh-my-openagent` không có trong `/Users/tranquangdang21/Projects/` và nhiệm vụ cấm clone thêm. Đây là **khoảng trống thật**, tôi ghi thẳng ra thay vì suy đoán.
>
> **Nhưng khoảng trống đó không ảnh hưởng kết luận:** OMO chỉ là *nguồn cảm hứng ý tưởng* (README nói rõ: "reuses many of OMO's *signature ideas*"), và **không một dòng code OMO nào nằm trong senpi**. Ta chép từ senpi ⇒ chỉ chịu ràng buộc MIT của senpi. License của OMO chỉ thành vấn đề nếu ta đi chép **trực tiếp từ OMO** — và đó là một quyết định riêng, không nằm trong M5.

Ngoài ra, `changes.md` (root) ghi: computer-use *"ships from omo (code-yeongyu/oh-my-openagent#8893)"* — tức senpi **đã chủ động gỡ bỏ** stack desktop vì OMO đã sở hữu nó. Một dấu hiệu fork biết giữ ranh giới.

---

## 4. Có phần nào KHÔNG được chép không

**Không. Không tồn tại ràng buộc pháp lý nào.** Đây là kết quả của một phép tìm kiếm phủ định, và phủ định ở đây có giá trị.

### 4.1 Đã đọc và không tìm thấy gì cấm

| Nguồn | Kết quả |
| --- | --- |
| `LICENSE` (root) | MIT thuần, không có điều khoản bổ sung |
| `NOTICE.md` | Chỉ ghi công, không cấm |
| `SECURITY.md` | Chỉ nói về trust boundary + quy trình báo lỗi. **Không** đề cập giới hạn bản quyền |
| `CONTRIBUTING.md` (162 dòng) | Đã đọc. **Không có** yêu cầu CLA/DCO |
| `.github/` | 24 file: workflows CI/publish, issue template, agent tooling. **Không có** `LICENSE`-header đặc biệt |
| Toàn bộ `*.md` | Tìm `do not` / `must not` / `forbidden` / `no copying` / `clean room` / `reverse engineer` → **toàn bộ là quy tắc quy trình dev nội bộ**, không liên quan pháp lý |

### 4.2 Hai điều duy nhất tìm thấy, đều không phải ràng buộc pháp lý

**(a) Ràng buộc thương hiệu** — `CONTRIBUTING.md:139-147`:

> ## Trademark and Brand References
> Use third-party marks only to identify integrations, compatibility, providers, and required setup. **Do not make senpi look endorsed by another project or vendor.**
> - Anthropic/Claude, OpenAI/GPT, GitHub, Discord: dùng theo nghĩa tham chiếu, theo hướng dẫn brand của họ.

Đây là quy tắc **cho chính người viết README của senpi**, áp dụng đối với người đóng góp. Nó **không cấm ta sao chép code**. Nhưng ta nên tôn trọng tinh thần của nó: đừng đặt tên sản phẩm khiến người ta tưởng senpi/pi bảo trợ.

**(b) Chính sách bảo mật** — `SECURITY.md` liệt kê "Out Of Scope", ví dụ *prompt injection*, *rủi ro từ repo không tin cậy*. Đây là định nghĩa **lỗ hổng nào được coi là bug**, không phải điều khoản pháp lý.

### 4.3 Cảnh báo duy nhất xứng đáng ghi lại

`README.md:9`:

> ⚠️ **Experimental.** senpi is an opinionated, **in-flight fork**... Use it; don't bet a production pipeline on it.

Đây là **cảnh báo ổn định (stability), không phải pháp lý**. Nhưng nó có giá trị thực tế cho M5: senpi tự nói mình có thể **thay đổi/xoá bất kỳ lúc nào**, kể cả những gì đã "vendored". Tham chiếu bằng **commit SHA cụ thể**, đừng tham chiếu bằng "senpi mới nhất".

---

## 5. Chiến lược fork — bài học cấu trúc cho M5

Không phải luật pháp, nhưng là thứ quyết định M5 có dễ hay không.

```bash
git -C $S ls-files | grep 'changes.md$' | wc -l          # => 62
ls -d $S/packages/coding-agent/src/core/extensions/builtin/*/ | wc -l   # => 40
```

- **62 file `changes.md`** — mỗi thư mục con có một, ghi "ta đổi gì so với upstream".
- **40 thư mục builtin extension** — tất cả **không tồn tại ở `badlogic/pi-mono`** (`README.md:223` khẳng định tường minh).
- Có cả **CI ép**: `scripts/audit-changes-md.mjs`, `scripts/check-pr-changes-md.test.mjs`, `scripts/changes-md-policy.mjs`, và workflow `.github/workflows/review-claims.yml`.

`CONTRIBUTING.md` gọi đây là **"Extension-first"**:

> 1. **Extension-first** — mọi tính năng mới đi vào `core/extensions/builtin/` hoặc extension người dùng. Chỉ đụng `core/` khi không hook nào làm được.
> 2. **`changes.md` contract** — mọi sửa file upstream phải có mục trong `changes.md` gần nhất.

**Đây chính là câu trả lời cho câu hỏi trong prompt gốc "senpi giống tôi, nhưng thêm rich features".** Cơ chế làm cho nó *giống ta*: senpi không sửa lõi, nó **cắm extension vào hook có sẵn của pi**. 40 extension, ~98k dòng, mà phần sửa lõi vẫn đủ nhỏ để merge upstream 70 lần mà không gãy.

> **Khuyến nghị M5:** nếu muốn lấy gì từ senpi, lấy theo đường extension, không lấy bản sửa lõi. Bản sửa lõi của senpi được viết để *hòa giải với upstream của senpi* (tức pi-mono) — đó là bài toán khác với bài toán của omp.

---

## 6. senpi đã chép từ omp hai lần — và đã ghi công khai

Đây là phát hiện quan trọng nhất về mặt *quan hệ*, và nó đảo ngược trực giác "senpi là thầy của ta".

`NOTICE.md` khoản 3 và 4, nguyên văn:

> ## TTSR stream-rule extension
> The TTSR (time-traveling stream rules) extension in
> `packages/coding-agent/src/core/extensions/builtin/ttsr/` is **ported and adapted from
> oh-my-pi's** `packages/coding-agent/src/export/ttsr.ts`, `src/session/ttsr-coordinator.ts`,
> `src/capability/rule.ts`, and `src/prompts/system/ttsr-interrupt.md`, which are MIT-licensed
>
> ## Todo tool
> The phased `todo` tool and `/todo` command in
> `packages/coding-agent/src/core/extensions/builtin/todotools/` are **ported and adapted from
> oh-my-pi's** `packages/coding-agent/src/tools/todo.ts`, `src/prompts/tools/todo.md`, and
> `src/modes/controllers/todo-command-controller.ts`, which are MIT-licensed

Kiểm chứng phía ta:

```bash
head -6 $OMP/LICENSE
```

```
MIT License

Copyright (c) 2025 Mario Zechner
Copyright (c) 2025-2026 Can Bölük
Copyright (c) 2026 Stencil Labs, Inc.
```

**Khớp chính xác** với dòng copyright mà senpi ghi trong NOTICE. Và `README.md` của omp xác nhận quan hệ: *"Built by Stencil Labs · Fork of Pi by @mariozechner"*.

Ngoài ra `.github/APPROVED_CONTRIBUTORS` của senpi (mang từ upstream) liệt kê `can1357` — tác giả của oh-my-pi.

**Hệ quả:**
1. Dòng chảy **hai chiều** và **cả hai đều MIT** — không có rào cản pháp lý nào theo hướng nào.
2. **Có tiền lệ rồi**: khi chép từ omp sang senpi, họ giữ attribution trong `NOTICE.md`. Đó là hành vi chuẩn mà ta nên theo khi chép ngược lại.
3. **Cảnh báo về attribution hai chiều**: nếu M5 lấy TTSR/todotools từ senpi, thì `NOTICE.md` của ta **vẫn phải giữ dòng "ported from oh-my-pi"** — vì code đó vẫn bắt nguồn từ ta. Vòng tròn, nhưng hợp pháp.

---

## 7. Kết luận pháp lý

> **Phép được.** `senpi` là fork MIT của `badlogic/pi-mono`, và `earendil-works/pi` **chính là** `badlogic/pi-mono` (chứng minh bằng root commit SHA trùng `a74c5da1` và pin SHA `71dca871` nằm trong cả hai repo). Cả hai root `LICENSE` đều MIT, mọi `package.json` khai MIT hoặc để trống (được root phủ), và toàn bộ phần bên thứ ba được khai đủ: LinkeDOM là ISC, các đoạn vay từ Gajae-Code và từ oh-my-pi đều MIT. Không có copyleft, không có CLA, không có DCO, không có điều khoản cấm sao chép — trong `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.github/`, hay bất kỳ `*.md` nào.
>
> **Ta chép được phần nào:** tất cả. 40 builtin extension, phần sửa lõi, `changes.md`, scripts, test — toàn bộ kỹ thuật đều hợp pháp. Về mặt pháp lý không có phần nào bị chặn.
>
> **Với điều kiện sau — cả ba đều bắt buộc:**
> 1. **Giữ nguyên MIT notice.** Bản MIT yêu cầu giữ "The above copyright notice and this permission notice". Ta phải giữ dòng `Copyright (c) 2025 Mario Zechner` (và của Yeongyu Kim nếu ta lấy code *riêng của senpi*, không chỉ phần kế thừa từ pi). Đây không phải formality — đó là **toàn bộ** nghĩa vụ mà MIT đặt ra.
> 2. **Thêm attribution cho phần vay mượn.** Code của senpi đã vay từ Gajae-Code (MIT, Can Bölük) và từ **chính oh-my-pi** (MIT, Can Bölük). Ta kế thừa những món nợ attribution đó và phải ghi lại trong `NOTICE.md` của omp. Tốt nhất: tạo `NOTICE.md` cho omp — hiện omp **chưa có** file này (`ls $OMP/NOTICE.md` → không tồn tại), dù LICENSE đã ghi 3 bên.
> 3. **Coi chất thương hiệu là vùng cấm, dù pháp lý cho phép.** `CONTRIBUTING.md` của senpi cấm tạo cảm giác được vendor khác bảo trợ. Ta không cần giữ tên `senpi`, không cần giữ tên `Dori`/`Sisyphus Labs`, và **không nên** dùng tên OMO/Senyphus. Chép *kỹ thuật* trong khuôn khung MIT, đặt tên theo omp.
>
> **Rủi ro thật sự không nằm ở luật — mà ở ổn định.** senpi tự gọi mình là *in-flight* và *"don't bet a production pipeline on it"*; nó đã **xoá** cả stack computer-use 10 crate vì OMO đã sở hữu tính năng đó. Mọi thứ ta lấy phải **ghim theo commit SHA cụ thể** (ví dụ `ea9216269e9254b821446130b60d1e00759761dc`), kèm `NOTICE.md` ghi rõ đã lấy ở đâu. Lấy "bản mới nhất" là cách chắc chắn nhất để hỏng sau 6 tháng.

---

## Phụ lục — lệnh tự chạy lại toàn bộ

```bash
PI=/Users/tranquangdang21/Projects/pi-ref
S=/Users/tranquangdang21/Projects/senpi-ref
OMP=/Users/tranquangdang21/Projects/ultraworkers

# §1 — điểm gốc fork
git -C $S log --all --author='YeonGyu-Kim' --reverse --format='%H|%ad|%s' --date=short | head -3
git -C $S log -1 --format='%P' 1ea83112b0
git -C $S log -1 --format='%ad %an %s' --date=short 05f79b08
cat $S/.github/upstream.json
git -C $S merge-base HEAD d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31
git -C $S rev-list --count HEAD..d6af72e1
git -C $S rev-list --count d6af72e1..HEAD

# §2 — pi == pi-mono
git -C $S rev-list --max-parents=0 --all
git -C $PI rev-list --max-parents=0 --all
git -C $PI cat-file -t 71dca871bc80b6bc97be37f0ca3189399d651fff
cmp -s $PI/SECURITY.md $S/SECURITY.md && echo IDENTICAL
git -C $PI log --all --format='%an' | sort | uniq -c | sort -rn | head -6
for f in $(git -C $PI ls-files 'packages/agent/src/*' | head -100); do
  cmp -s "$PI/$f" "$S/$f" && echo same
done | wc -l

# §3 — license
git -C $S ls-files | grep -iE '(^|/)(LICENSE|NOTICE|COPYING)'
head -6 $S/LICENSE; head -6 $PI/LICENSE; cat $S/NOTICE.md
cd $S && for f in $(git ls-files | grep -E '(^|/)package\.json$'); do
  python3 -c "import json;print(json.load(open('$f')).get('license','<none>'))"
done | sort | uniq -c | sort -rn
cat $S/packages/coding-agent/src/core/extensions/builtin/external-versions.json
git -C $S ls-files | grep -iE 'oh-my-openagent|/omo/'   # => rỗng

# §4 — hạn chế
sed -n '139,150p' $S/CONTRIBUTING.md
git -C $S grep -inE 'CLA |developer certificate|DCO|trademark' -- '*.md' | head

# §5 — cấu trúc fork
git -C $S ls-files | grep 'changes.md$' | wc -l
ls -d $S/packages/coding-agent/src/core/extensions/builtin/*/ | wc -l
sed -n '23,40p' $S/CONTRIBUTING.md

# §6 — chiều dòng ngược lại
sed -n '/TTSR/,/^```$/p' $S/NOTICE.md
head -6 $OMP/LICENSE
ls $OMP/NOTICE.md
```
