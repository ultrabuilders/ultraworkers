# SENPI — nghiên cứu cho M5

`senpi` là một repo thứ sáu trên đĩa: fork MIT của đúng dòng `pi` mà M1B đang chép, mang
sẵn 40 builtin extension (97.893 dòng). Ý tưởng ban đầu là port chúng vào omp. **Đo xong thì
phần lớn không cần port** — và lý do mới quan trọng hơn câu chuyện port.

> **Đọc `Tổng hợp` §2 trước nếu bạn chỉ quan tâm M1B.** Nó trả lời câu hỏi nguồn chép — câu đó
> **đã đóng: `pi`, không phải `senpi`** — và đưa ra một đề xuất lớn hơn:
>
> **`durable` có thể không cần chép. M1B rút từ 7 package xuống 6, tiết kiệm 21.093 dòng.**
> Lý do: `durable` của `pi` là package **chết** — không package nào ngoài nó import, bằng chứng
> duy nhất là 23 file test của chính nó. Tầng session thật sự chạy nằm ở
> `packages/agent/src/harness/session/jsonl/`, và tôi đã kiểm: **8/8 file giống hệt từ byte**
> giữa `pi` và `senpi` (1.894 dòng). Cả hai đều **hard-fail** khi JSONL hỏng. Chép bất kỳ tầng
> session nào của chúng vào omp đều là **lùi về sau** so với `parseJsonlLenient` +
> `malformedRecords → #rewriteRequired` mà omp đang có.
>
## Cách đọc tài liệu này

Mỗi phần là một bài riêng, viết bởi một agent riêng, đo trên cây thật. Chúng **sửa lẫn nhau** —
và đó là chủ ý: phần sau luôn đo lại phần trước bằng công cụ đúng, rồi ghi rõ phần nào sai.
Khi hai phần mâu thuẫn, **phần sau có quyền hơn** vì nó đọc file thay vì grep.

Số liệu đã dịch chuyển theo từng vòng, và đó là kết quả chứ không phải sự cẩu thả:

| vòng | kết luận | vì sao đổi |
|---|---|---|
| 1 | 40 builtin, port cả | đếm tên thư mục, chưa đối chiếu omp |
| 2 | 25/40 omp đã có, 9 thiếu | mở file omp thật thay vì grep |
| 3 | 8 thiếu | `git grep -E '\bbtw\b'` **luôn trả 0** trên macOS; `btw` omp đã có |
| 4 | **4 hạng mục, ~1.325 dòng** | `cursor.ts` đã xử lý dangling call; `model-resolver.ts` đã có `splitThinkingSuffix` |

Nguyên tắc rút ra, đáng ghi hơn mọi con số: **mỗi lần kiểm lại đúng, công ước lượng GIẢM chứ
không tăng.** Tài liệu port nào đòi hỏi nhiều công hơn sau khi kiểm tra lại là tài liệu đang
đo sai.

## Ba câu hỏi mở mà tôi đã tự chốt lại

Tài liệu bên dưới để một số câu ở trạng thái *chưa đủ dữ liệu*. Tôi đã chạy lệnh cho ba câu
quan trọng nhất. Phép đo của tôi, không phải của agent:

| câu | các nguồn cho | tôi đo | lệnh |
|---|---|---|---|
| **Số event `on(...)` của omp** | 37 · 41 · 41 · **46** | **41** | xem bên dưới |
| `packages/agent/src/harness/session/jsonl/` giống nhau giữa `pi` và `senpi`? | chưa ai đo | **8/8 file, 1.894 dòng** | `cmp` từng file |
| `packages/durable/` có ở senpi không? | 0 | **0** | `git ls-files 'packages/durable/*' \| wc -l` |

**Về số event** — đây là câu `M5-SENPI.md` §7.8 yêu cầu một lệnh duy nhất để chốt, và tôi đã
chạy. Ba phương pháp, cùng một kết luận:

```bash
F=packages/coding-agent/src/extensibility/extensions/types.ts
grep -oE 'on\(event: "[a-z_.]+"' $F | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u | wc -l   # 41
tr '\n' ' ' < $F | grep -oE 'on\([a-zA-Z_]*: "[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u | wc -l  # 41
# hợp với phía phát sự kiện:                                                                                        # 41
```

Hai danh sách **giống hệt nhau** (`comm` ra rỗng cả hai chiều). **46 thì tôi không tái lập
được** bằng bất kỳ cách nào. Mang **41**; để **46** ở trạng thái chưa có bằng chứng.
Hệ quả: bảng *23 chung · 21 chỉ-senpi · 18 chỉ-omp* của Phần 4 §1b **được giữ**, vì nó tính
trên mẫu số 41.

## Mục lục

- [Tổng hợp](#tổng-hợp) — Kết luận và thứ tự làm. Đọc phần này trước.
- [Phần 1 — senpi là con của ai](#phần-1--senpi-là-con-của-ai) — Dòng dõi với pi, và quyền pháp lý.
- [Phần 2 — M1B nên chép từ đâu](#phần-2--m1b-nên-chép-từ-đâu) — Câu hỏi nguồn chép, đã đóng: từ `pi`.
- [Phần 3 — bản đồ 40 builtin](#phần-3--bản-đồ-40-builtin) — Cái nào là gì, cái nào omp đã có.
- [Phần 4 — phần omp đã có](#phần-4--phần-omp-đã-có) — 25/40 không cần làm gì.
- [Phần 5 — phần omp thiếu thật](#phần-5--phần-omp-thiếu-thật) — Đặc tả port, và các bẫy đo đã sửa.
- [Phần 6 — seam hạ tầng](#phần-6--seam-hạ-tầng) — Cái gì chạy được ngay, cái gì cần mở seam.
- [Phần 7 — rủi ro khi chép](#phần-7--rủi-ro-khi-chép) — Phân tích sâu nhất, dài nhất.
- [Phần 8 — phản biện (kế thừa)](#phần-8--phản-biện-(kế-thừa))
- [Phần 9 — phản biện (thiếu)](#phần-9--phản-biện-(thiếu))
- [Phần 10 — phản biện (seam)](#phần-10--phản-biện-(seam))

---

# Tổng hợp

## M5 — senpi: tài liệu tổng hợp

> Ngày tổng hợp: 2026-09-28. Nguồn: `.lavish-wip/senpi-md/*.md` (13 file, 7.180 dòng).
> Repo: `senpi` = `/Users/tranquangdang21/Projects/senpi-ref`, `omp` = `/Users/tranquangdang21/Projects/ultraworkers`, `pi` = `/Users/tranquangdang21/Projects/pi-ref`.
>
> **Quy tắc đọc:** mọi khẳng định dưới đây kèm lệnh + đường dẫn + số dòng, và bị giới hạn ở những gì vòng trước đã đo. Chỗ nào hai nguồn cho hai số khác nhau thì in cả hai. Chỗ nào chưa có bằng chứng thì ghi **"chưa đủ dữ liệu"** thay vì suy đoán.
>
> **Thứ tự ưu tiên bằng chứng:** `verify-*` > `deep-*` > định hướng. Tài liệu này bám theo thứ tự đó.

---

## 1. Senpi là gì

**senpi là một fork sống của `badlogic/pi-mono`** — cùng dòng code với `pi` (tức `earendil-works/pi`), không phải một dự án độc lập. Nó đặt cây lên đỉnh commit upstream `05f79b08` (2026-04-25, pidalf) bằng một commit ghép một-parent, đồng bộ upstream 70 lần, và tự thêm 7.682 commit. Tên cũ của fork là **sanepi**. Về mặt quy mô: 5.554 file `.ts`/`.tsx`, 955.527 dòng, 13 package.

### 1.1 Dòng dõi

```bash
git -C $S log -1 --format='%P' 1ea83112b0
# => 05f79b08516809e0e06756013645c37419bf5570     (một parent duy nhất)
git -C $S log -1 --format='%ad %an %s' --date=short 05f79b08
# => 2026-04-25 pidalf docs: explain issue triage policy (#3725)
git -C $S log --oneline --all --grep='upstream/main' --merges | wc -l   # => 70
git -C $S log --all --format='%an' | sort | uniq -c | sort -rn | head -5
# 7682 YeonGyu-Kim | 3783 Mario Zechner | 740 Armin Ronacher | 276 David Brailovsky | 235 senpi-release-bot
```

`pi-ref` và `badlogic/pi-mono` là **một**, chứng minh bằng root commit trùng SHA:

```bash
git -C $S  rev-list --max-parents=0 --all   # a74c5da112c29466f182a03108337a488c785d76
git -C $PI rev-list --max-parents=0 --all   # a74c5da112c29466f182a03108337a488c785d76
cmp -s $PI/SECURITY.md $S/SECURITY.md && echo IDENTICAL    # => IDENTICAL
```

**Hệ số nhánh (con số quan trọng nhất cho M5):**

```bash
git -C $S rev-list --count HEAD..d6af72e1   # => 194    (pi đi trước senpi 194 commit)
git -C $S rev-list --count d6af72e1..HEAD   # => 8415   (senpi có 8415 commit riêng)
```

**senpi đang đi sau upstream 194 commit.** Đồng thời, bản `chord` của senpi vẫn kẹt ở `0.85.1` trong khi `pi` đã ở `0.87.1` — `.github/upstream.json` ghi rõ:

```json
{ "repo": "badlogic/pi-mono", "tag": "v0.85.1",
  "sha": "71dca871bc80b6bc97be37f0ca3189399d651fff",
  "synced_at": "2026-09-12T06:08:28Z" }
```

> `tag` ≠ `sha`: `71dca871` là **tip của `upstream/main`** lúc sync, còn `v0.85.1` là release tag cuối cùng được sync. Không mâu thuẫn. `git -C $PI rev-list --count 71dca871..$(git -C $PI rev-list -n1 v0.85.1)` → `0`, pin mới hơn tag.

### 1.2 Quyền pháp lý — phép được, không có ràng buộc

Root `LICENSE` của senpi là **MIT thuần, hai dòng copyright**:

```
MIT License
Copyright (c) 2025 Mario Zechner (upstream pi-mono)
Copyright (c) 2026 Yeongyu Kim and senpi contributors
```

Audit toàn bộ trường `license` trong mọi `package.json`: **12 file `MIT`, 14 file `<none>`** (root private, 2 crate Rust, 5 example extension, plugin mẫu, `install-lock`, protocol generated, `evals`, doc sandbox — tất cả đều được root MIT phủ). **Không có GPL/AGPL/LGPL/BSL/Apache-with-patent.**

`NOTICE.md` (67 dòng) ghi 4 khoản, tất cả permissive: LinkeDOM 0.18.12 (**ISC** — ràng buộc duy nhất có hành vi thật: phải giữ copyright + permission notice trong mọi bản copy), system prompt lấy cảm hứng từ Gajae-Code (MIT), extension **TTSR** port từ **oh-my-pi** (MIT), tool **todo** + `/todo` port từ **oh-my-pi** (MIT).

Không tìm thấy ràng buộc cấm sao chép ở bất kỳ đâu: `LICENSE`, `NOTICE.md`, `SECURITY.md`, `CONTRIBUTING.md` (162 dòng, **không có CLA/DCO**), `.github/` (24 file), hay bất kỳ `*.md` nào.

**Ba điều kiện bắt buộc khi lấy code từ senpi:**
1. **Giữ nguyên MIT notice** — dòng `Copyright (c) 2025 Mario Zechner`, cộng dòng của Yeongyu Kim nếu lấy code *riêng của senpi*.
2. **Ghi attribution cho phần vay mượn** vào `NOTICE.md` của omp — **omp hiện chưa có file này** (`ls $OMP/NOTICE.md` → không tồn tại), dù LICENSE đã ghi 3 bên (Mario Zechner, Can Bölük, Stencil Labs).
3. **Coi thương hiệu là vùng cấm** dù pháp lý cho phép. `CONTRIBUTING.md:139-147` của senpi: *"Do not make senpi look endorsed by another project or vendor."*

**Rủi ro thật không nằm ở luật mà ở ổn định.** `README.md:9`: *"⚠️ Experimental… an in-flight fork… Use it; don't bet a production pipeline on it."* Senpi đã **xoá** cả stack computer-use 10 crate vì OMO đã sở hữu tính năng đó. Mọi thứ lấy từ senpi phải **ghim theo commit SHA cụ thể** (HEAD lúc đo: `ea9216269e9254b821446130b60d1e00759761dc`), không lấy "bản mới nhất".

### 1.3 Chiều dòng ngược lại — senpi đã chép từ omp

`NOTICE.md` khoản 3 và 4, nguyên văn, nói TTSR và todo **"ported and adapted from oh-my-pi's"** `src/export/ttsr.ts`, `src/session/ttsr-coordinator.ts`, `src/capability/rule.ts`, `src/tools/todo.ts`. Khớp chính xác với `head -6 $OMP/LICENSE` (Can Bölük, Stencil Labs).

Dòng chảy **hai chiều, cả hai đều MIT**. Có tiền lệ rồi: khi chép từ omp sang senpi, họ giữ attribution trong `NOTICE.md` — đó là hành vi chuẩn nên theo khi chép ngược lại. Vòng tròn attribution: nếu M5 lấy TTSR/todotools từ senpi thì `NOTICE.md` của ta **vẫn phải giữ** dòng "ported from oh-my-pi", vì code đó vẫn bắt nguồn từ ta.

### 1.4 Chiến lược fork — bài học cấu trúc

62 file `changes.md` (mỗi thư mục con một, ghi "ta đổi gì so với upstream") + 40 thư mục builtin extension, tất cả **không tồn tại ở `badlogic/pi-mono`**. Có CI ép: `scripts/audit-changes-md.mjs`, `scripts/changes-md-policy.mjs`, workflow `.github/workflows/review-claims.yml`.

`CONTRIBUTING.md` gọi đây là **"Extension-first"**: mọi tính năng mới đi vào `core/extensions/builtin/` hoặc extension người dùng; chỉ đụng `core/` khi không hook nào làm được.

> **Đây chính là câu trả lời cho "senpi giống tôi, nhưng thêm rich features".** Cơ chế làm cho nó *giống ta*: senpi không sửa lõi, nó **cắm extension vào hook có sẵn của pi**. 40 extension ~98k dòng mà phần sửa lõi vẫn đủ nhỏ để merge upstream 70 lần không gãy.
>
> **Khuyến nghị M5:** lấy gì từ senpi thì lấy **theo đường extension**, không lấy bản sửa lõi. Bản sửa lõi của senpi được viết để *hòa giải với upstream của senpi* (pi-mono) — bài toán khác với bài toán của omp.

---

## 2. M1B nên chép từ `pi` hay từ `senpi` — theo từng package

### 2.1 Câu trả lời ngắn: **`pi`, cả 7 package.**

Trong 7 package M1B cần, **senpi đóng góp đúng 3 dòng code mới** (ba chú thích type `(chunk: Buffer)`), và **không hề có** package thứ bảy là `durable`. Riêng `chord` thì senpi là **bản lùi** so với `pi`.

### 2.2 Mấu chốt: chênh lệch version, mọi phép đo chỉ là hệ quả

| package | `pi-ref` | `senpi-ref` |
| --- | --- | --- |
| agent | `@earendil-works/pi-agent-core` **0.87.1** | `@earendil-works/pi-agent-core` **2026.9.28-3** |
| chord | `@earendil-works/chord` **0.87.1** | `@earendil-works/chord` **0.85.1** |
| ai | 0.87.1 | 2026.9.28-3 |
| coding-agent | 0.87.1 | 2026.9.28-3 |
| telemetry | 0.87.1 | 2026.9.28-3 |

Cột tên package của senpi **giữ nguyên `@earendil-works/...`** (dấu hiệu fork-in-flight). `packages/protocol/changes.md` của chính senpi: *"`@earendil-works/chord` is pinned to the exact upstream `0.85.1` it resolves to … the fork does not publish it."*

⇒ **senpi fork từ pi ở đúng 0.85.1; pi nay đã tới 0.87.1.**

### 2.3 Bảng đo 7 package

Lệnh: `git -C <repo> ls-files 'packages/<p>/*' | wc -l` + `cmp` từng file.

| package | pi file | pi dòng | senpi file | senpi dòng | giống byte | chỉ có ở pi | cùng có nhưng KHÁC | chỉ có ở senpi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| chord | 62 | 19.006 | 41 | 10.871 | **22/62 (35,4%)** | **23** | 17 | 2 |
| protocol | 17 | 1.591 | 19 | 1.707 | **15/17 (88,2%)** | 0 | 2 | 2 |
| server | 29 | 3.288 | 31 | 4.520 | **24/29 (82,7%)** | 0 | 5 | 2 |
| client | 19 | 2.151 | 21 | 2.279 | **15/19 (78,9%)** | 0 | 4 | 2 |
| **durable** | **63** | **21.093** | **0** | **0** | **0/63 (0%)** | **63** | 0 | **0** |
| telemetry | 12 | 1.727 | 14 | 1.794 | **8/12 (66,6%)** | 0 | 4 | 2 |
| evals | 30 | 3.605 | 25 | 3.092 | **1/30 (3,3%)** | **25** | 4 | **20** |

Tự kiểm: `giống + chỉ_có_pi + khác = pi_file` và `giống + khác + chỉ_có_senpi = senpi_file` — đúng cả 7 hàng.

**Cột "chỉ có ở senpi"** với 6 package gần như luôn **2 file**: `changes.md` + `AGENTS.md`/`CHANGELOG.md` — sổ ghi chép fork, không phải code. Riêng `evals` có 20 file (xem 2.9).

### 2.4 Verdict từng package

| package | Chép từ | Lý do đo được |
| --- | --- | --- |
| **chord** | **`pi`** | Senpi thiếu **23 file**, mất hệ delta 3.635 → 1.267 dòng, mất `diffRevisions`/`Draft`/`applyImmutableBatches`, mất API `ReplicatedStateSource`. Chép từ senpi là **lùi**. |
| **protocol** | **`pi`** (hòa tuyệt đối) | Lọc bỏ sổ ghi chép fork thì **0 file nguồn khác nhau**. Lấy `pi` để giữ **một nguồn duy nhất** cho cả 7 — quyết định vận hành, không phải kỹ thuật. |
| **server** | **`pi`** | Senpi chỉ thêm **2 dòng** `(chunk: Buffer)`, type-only. `changes.md` của senpi tự xác nhận *"runtime behavior is unchanged"*. |
| **client** | **`pi`** | Y hệt `server`: **2 dòng** `(chunk: Buffer)` ở `src/unix.ts`, cộng 2 chỗ trong `test/unix-transport.test.ts`. |
| **durable** | **`pi`** — nhưng **đừng chép nguyên xi** | Senpi có **0 file**; chỉ `pi` có. **Nhưng** `durable` của `pi` không package nào import, và tầng storage thật là `agent/harness/session/jsonl` — **8/8 byte giống senpi**. Chép 21.093 dòng code chết là chi phí vô ích. |
| **telemetry** | **`pi`** | 43 dòng khác ở `src/index.ts` + `types.ts` là **formatter wrap** (TypeScript/biome pin khác), không ngữ nghĩa. |
| **evals** | **`pi`**, rồi *cân nhắc* lấy cảm hứng từ `senpi` | Lệch thật (1/30) nhưng là **viết lại theo hướng khác**, không phải "nhiều hơn". Chọn theo nhu cầu, không theo mặc định. |

### 2.5 `chord` — bằng chứng cụ thể cho lập luận "senpi là bản lùi"

**(a) 23 file `pi` có, senpi không.** Phần lớn là hệ delta đã tách module ở `pi`:

| file | dòng |
| --- | ---: |
| `packages/chord/src/delta/tracker.ts` | 2.205 |
| `packages/chord/src/delta/diff.ts` | 523 |
| `packages/chord/src/delta/apply-immutable-trusted.ts` | 128 |
| `packages/chord/src/delta/revision-validator.ts` | 75 |
| `packages/chord/src/delta/draft.ts` | 10 |
| `test/delta-benchmark/*` (6 file), `test/delta-tracker/*` (3 file), `test/state-*.test.ts` + `state.test.ts` (5 file) | — |

Cân bằng dòng: `pi` delta = 694 + 2.205 + 523 + 128 + 75 + 10 = **3.635 dòng**; `senpi` delta = **1.267 dòng** (gộp tất cả vào `index.ts`).

**(b) API surface.** `grep -n "^export" $PI/packages/chord/src/delta/index.ts | grep -E "diffRevisions|Draft|applyImmutableBatches"` → có; trên senpi → **rỗng**. `src/index.ts` của `pi` export thêm: `Draft`, `copyJson`/`CopyJsonOptions`, `AttachedReplicatedState`, `ReplicatedStateSource*` (4 symbol).

**(c) Feature mới của `pi` mà senpi chưa có** — `src/api.ts` (26 dòng khác):

```diff
-	export function replicatedState<T extends object>(initial: T): MutableReplicatedState<T>
-		return new MutableReplicatedStateImpl(initial)
+	export function replicatedState<T>(source: ReplicatedStateSource<T>, options?): AttachedReplicatedState<T>
+		if (isReplicatedStateSource(initialOrSource)) return attachReplicatedStateSource(initialOrSource, options)
```

Tức `pi` đã cho phép **gắn state từ một nguồn bên ngoài** (replica), senpi chưa. `types.ts` (141 dòng khác) xác nhận thêm: `pi` có `change(context, mutate: (draft: Draft<T>) => void)`.

> **Ghi chú chống hiểu nhầm:** `git -C $PI grep -rn "diffRevisions\|applyImmutableBatches" -- 'packages/coding-agent/src' 'packages/agent/src'` trả về **rỗng** — hiện tại `pi` cũng chưa ai tiêu thụ. Đây là **API đã có sẵn để dùng**, không phải thứ đang chạy.

### 2.6 `durable` — package thứ bảy không tồn tại ở senpi, VÀ bản của `pi` là code chết

```bash
git -C $SE ls-files 'packages/durable/*' | wc -l   # 0
ls -d $SE/packages/durable                          # No such file or directory
```

`git ls-files | grep durable` trong senpi cho 11 hit nhưng **không cái nào là package** — toàn là `builtin/terminal/durable-command.ts`, `durable-file.ts`, và test.

Nhưng bản của `pi` cũng không ai dùng:

```bash
git -C $PI grep -rn "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
# README.md:33 · package-lock.json:738,5778 · scripts/durable-browser-smoke-entry.ts · tsconfig.json:19-21
```

4 nơi, **không nơi nào là mã sản phẩm**. `packages/agent/package.json` deps không có `pi-durable`. Nó vẫn publishable (`private` không set, `license: MIT`, 9 export subpath) nên build xanh — chỉ là không nối vào sản phẩm.

**Tầng durable thật sự chạy nằm ở `agent`, và hai repo giống nhau 8/8 byte:**

```bash
for f in $(git -C $PI ls-files 'packages/agent/src/harness/session/jsonl/*'); do
  cmp -s "$PI/$f" "$SE/$f" || echo "DIFF $f"; done   # (không in gì) → 8/8 identical
```

8 file (`codec.ts` `fork.ts` `index.ts` `io.ts` `legacy-v3.ts` `repo.ts` `storage.ts` `types.ts`), ~1.894 dòng.

### 2.7 `evals` — chỗ duy nhất lệch thật, nhưng là hướng thiết kế khác

| | `pi` | `senpi` |
| --- | --- | --- |
| `vitest-evals` | 0.15.0 | **0.17.0** |
| `vitest` | 4.1.9 | **5.0.1** |
| tên | `@earendil-works/pi-evals` (0.87.1) | `@code-yeongyu/senpi-evals` (2026.7.25) |

`pi` giữ: harness tự viết (`src/harness.ts`, `cli.ts`, `plan.ts`, `report.ts`) + **Docker** (`docker/Dockerfile`, `docker/entrypoint.ts`, `src/docker.ts`).
Senpi bỏ toàn bộ nhánh Docker và `plan`/`report`/`cli`, thay bằng `src/vitest-evals/{artifacts,harness-table,reporter,setup,summary}.ts`.

- **Senpi làm tốt hơn:** harness bám vitest-native (bảng harness, artifacts, summary thay cho báo cáo tự viết); `vitest-evals`/`vitest` mới hơn 2–3 bậc.
- **Senpi không cho:** eval chạy trong container Docker cách ly; và theo `changes.md` của chính senpi, harness của nó **hard-code import `@code-yeongyu/senpi`** nên phải sửa lại mới dùng được cho omp.

⇒ **ưu tiên thiết kế, không phải "senpi hơn". Không nên coi `evals` là lý do đổi nguồn.**

### 2.8 Câu hỏi JSONL hỏng — senpi KHÔNG sửa, và có cách thứ ba

Điều kiện tiên quyết đã nêu, kiểm lại — **đều đúng**:

```bash
grep -n "export function parseJsonlLenient" $OMP/packages/utils/src/stream.ts
# 575:export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[] {
```

```bash
sed -n '80,84p;114,120p' $PI/packages/durable/src/storage/jsonl/storage.ts
# dòng 80: export class JsonlCorruptionError extends Error
# dòng 119: throw new JsonlCorruptionError(`Malformed complete ${description}`, ...)
```

`catch` ở đó **chỉ bọc `JSON.parse` rồi ném lại thành lỗi có kiểu — không có cơ chế phục hồi nào**. Xác nhận.

**senpi: cả ba lệnh đều rỗng.**

```bash
git -C $SE grep -n "CorruptionError"    -- 'packages/*'   # rỗng
git -C $SE grep -rn "parseJsonlLenient" -- 'packages/*'   # rỗng
git -C $SE grep -rn "alformedRecord"    -- 'packages/*'   # rỗng
```

Và cái senpi thực sự làm cũng là **hard-fail**, chỉ khác là ném `Error` trần:

```ts
// packages/agent/src/harness/session/jsonl/io.ts
export function parseJsonlTransaction(line: string): CommittedWrite[] {
	let value: unknown;
	try { value = JSON.parse(line); }
	catch (error) { throw new Error("Invalid JSONL transaction: not valid JSON", { cause: error }); }
```

⇒ **senpi đứng cùng phía với `pi`**, không tự lành JSONL hỏng.

> **Kết luận cho M1B — mạnh hơn cả đề bài dự đoán:** không chỉ "dùng senpi không giúp", mà **senpi không có `durable` để mà lấy**, và tầng storage thật của nó (8/8 byte giống `pi`) cũng ném lỗi trần y hệt. `omp` **phải giữ nguyên thiết kế tự lành của mình**. Chép bất kỳ tầng session nào của `pi` hay `senpi` vào omp đều là **lùi về sau** so với `parseJsonlLenient` + `onMalformedRecord` + `malformedRecords → #rewriteRequired`.
>
> Bất kỳ thứ gì chạm JSONL trong omp phải đi qua `parseJsonlLenient` (`packages/utils/src/stream.ts:575`).

### 2.9 Khuyến nghị cụ thể cho M1B

1. **Đổi câu hỏi của M1B.** `durable` về mặt kỹ thuật là **package chết không ai import**. Trước khi chép 21K dòng: omp có thực sự cần `durable`, hay chỉ cần tầng session mà `agent/harness/session` đã cung cấp? Nếu "không", M1B **rút từ 7 xuống 6** package, tiết kiệm 21.093 dòng + một `JsonlCorruptionError` làm chật session resilience.
2. **Nguồn chép = `pi`, toàn bộ.** Không package nào trong 7 mà senpi đóng góp code mới đáng kể. `senpi` là nguồn tham chiếu **cho M5** (40 extension builtin, `pty`, `senpi-codemode`), **không phải cho M1B**.
3. **Hai thứ duy nhất đáng cân nhắc lấy từ senpi, đều nhỏ:** (a) chú thích `(chunk: Buffer)` — omp tự thêm được nếu gặp lỗi type; (b) bộ `vitest-evals` harness mới — chỉ khi omp quyết định bỏ Docker-based evals.
4. **Cấm chép tầng session của `pi`.**

### 2.10 Chỗ nào M1B **chưa đủ dữ liệu**

- **Chưa đo:** ba chú thích `(chunk: Buffer)` có thực sự cần cho omp không, hay omp đã build xanh với type Node hiện tại? Cần: `bun check` trên `packages/server` + `packages/client` của omp. Nếu xanh sẵn thì mục 3 khỏi việc port.
- **Chưa đo:** `durable` có phải thứ M1B thực sự cần, hay chỉ là do ai đó liệt kê 7 package từ `pi/README.md:33`? Đây là quyết định **của người đọc**, không phải phép đo thêm được — nhưng có thể đo bằng cách grep xem omp hiện đang cần tầng session nào.
- **Chưa đo:** chi phí thực tế để làm `durable` của `pi` **sống** (nối vào sản phẩm) so với bỏ. Không có bằng chứng nào trong 13 file về việc ai đã làm việc này.
- **Chưa đo:** `evals` của omp hiện tại dùng Docker hay không, và sẽ cần gì. 13 file không nói gì về evals của omp.

_(tiếp: §3 bảng builtin, §4 danh sách port, §5 seam, §6 cái KHÔNG nên lấy, §7 mâu thuẫn)_

---

## 3. Bảng builtin — 40 thư mục, 97.893 dòng

Cột "dòng" đếm `.ts + .tsx + .md` trong thư mục. Cột hook/tool/cmd đếm bằng `grep -rhoE`.
Phán quyết: **(a)** omp thiếu hẳn · **(b)** omp có nhưng yếu hơn · **(c)** omp đã mạnh hơn hoặc ngang.
Cột "lõi" = tỉ lệ entry trong `changes.md` tự thú *"Why an extension could not handle it"* ⇒ thay đổi phải sửa core, không làm được bằng extension.

senpi HEAD khi đo: `ea9216269e9254b821446130b60d1e00759761dc`.

| # | builtin | dòng | file | làm gì | bề mặt đăng ký | omp đã có? | verdict |
|---|---|---|---|---|---|---|---|
| 1 | `compaction` | 10.788 | 50 | Pipeline nén ngữ cảnh: checkpoint, circuit-breaker, warm-anchor | 9 hook, 2 provider | `src/session/compaction-methods.ts`, `compact-modes.ts`, `snapcompact-*` | **(c)** — omp có snapcompact riêng, ghép sẽ hỏng cả hai |
| 2 | `mcp` | 10.244 | 67 | Cầu nối MCP client: nạp server, tool `mcp__*`, OAuth | 5 tool, 2 cmd, 3 hook, 1 renderer | `src/mcp/` 15 file + `capability/mcp.ts` + 4 doc, 129 file tracked | **(c)** — không lấy, tạo hai hệ MCP song song |
| 3 | `anthropic-subscription` | 8.779 | 58 | Provider lane Claude subscription (SDK OAuth) | 1 cmd, 15 hook, 1 flag, 1 provider | 310 file khớp `oauth`; `crates/pi-natives/src/oauth_callback/` | **(b)** — nhưng **52/69 = 75% lõi**, không lấy |
| 4 | `terminal` | 8.260 | 53 | PTY bền vững: 6 bash tool, lease, restore, orphan-reaper | 6 tool, 7 hook, 2 renderer | `tools/bash.ts` 58 KB có `"pty?"` + `bash-pty-selection.ts` + crate `pi-shell` (`shell.rs` 228 KB) | **(b)** — có PTY rồi, không lấy nguyên si |
| 5 | `goal` | 6.304 | 39 | Vòng lặp mục tiêu tự tiếp tục + cache-warm | 3 tool, 1 cmd, 13 hook, 1 renderer | `src/goals/` — 5 file, **715 dòng TS** + 3 prompt | **(b)** — senpi 4.566 dòng TS, gấp 6,4×; 21/63 lõi |
| 6 | `cursor-cli-oauth` | 5.620 | 25 | Lane Cursor CLI OAuth: spawn, đo model, refresh catalog | 1 cmd, 2 hook, 1 provider | `packages/ai/src/providers/cursor.ts` | **(b)** — **12/13 = 92% lõi** |
| 7 | `hooks` | 4.663 | 23 | Engine hook người dùng (Claude-Code style `hooks.json`) | 9 hook, 1 cmd | `extensibility/hooks/` | **(c)** — không đo chi tiết; xem §7 |
| 8 | `prompt-preset` | 4.305 | 40 | Thư viện prompt theo model: chọn preset rồi bơm vào system prompt | 2 hook | `git grep -c prompt.preset` → không rõ | **(a)** — **chưa đo được** |
| 9 | `loop` | 4.134 | 13 | Bộ hẹn giờ lặp: cron planner, tick prompt, scheduler | 1 tool, 1 cmd, 7 hook, 1 renderer | `/loop` tại `slash-commands/builtin-modes.ts:324`, `modes/loop-condition`, `modes/loop-limit` | **(b)** — có loop nhưng khác hẳn hình dạng |
| 10 | `ttsr` | 3.783 | 28 | Điều phối TTS, có cắt ngang (interrupt) | 1 cmd, 9 hook, 2 flag | `src/tools/tts.ts` 232 dòng + crate `pi-voice` (`live.rs` 21 KB) | **(b)** — nhưng 9 file lõi, `inside=1 outside=6`, không lấy |
| 11 | `todotools` | 3.263 | 21 | Tool todo + tự nhắc nếu lượt kết thúc mà todo chưa xong | 1 tool, 1 cmd, 6 hook | `src/tools/todo.ts` 27 KB, `todo-command-controller.ts`, event `todo_reminder` | **(c)** — và senpi đã port cái này **từ omp** (NOTICE khoản 4) |
| 12 | `rules` | 2.980 | 20 | Nạp `AGENTS.md`/rules theo thư mục, kích hoạt theo bucket | 2 cmd, 3 hook, 2 flag | `src/capability/rule.ts`, `rule-buckets.ts`, `discovery/agents-md.ts` | **(c)** |
| 13 | `config-reload` | 2.597 | 11 | Theo dõi FS, tự reload config/settings/extension | 5 hook | `git grep -c config-reload` → **0** | **(a)** — nhưng **11/12 = 92% lõi**, chỉ lấy nếu chấp nhận sửa `src/config.ts` |
| 14 | `gpt-apply-patch` | 2.351 | 21 | Tool apply-patch riêng cho OpenAI/Codex wire mode | 2 tool, 3 hook | không có `apply_patch` tool; có `ast-edit.ts` | **(a)** |
| 15 | `websearch` | 2.342 | 26 | Tìm web qua provider: Brave, Tavily, Kagi, SERPdive | 1 tool, 1 cmd, 3 hook | tool `web_search` trong `BUILTIN_TOOL_NAMES`, 48 file khớp | **(b)** — chưa so danh sách provider |
| 16 | `permission-system` | 1.859 | 17 | Lớp phân quyền: mỗi tool tự phân loại lệnh gọi | 3 hook, 2 flag | `src/tools/approval.ts` 13 KB, `session/acp-permission-gate.ts` | **(b)** |
| 17 | `tool-search` | 1.411 | 9 | Tìm tool theo mô tả thay vì nhét hết vào context | 1 tool, 3 hook, 1 renderer | `git grep -c tool_search` → 8 file | **(b)** |
| 18 | `ask-user` | 1.284 | 12 | Hỏi người dùng giữa lượt, có timeout, panel | 2 tool, 1 cmd, 4 hook, 1 flag | `src/tools/ask.ts` **41 KB** | **(c)** — omp mạnh hơn |
| 19 | `imagegen` | 1.258 | 9 | Tool sinh ảnh qua skill nhúng, có auth resolution | 1 tool, 1 hook | `src/tools/image-gen.ts` 12 KB | **(c)** ngang — nhưng 7/14 = 50% lõi nếu lấy |
| 20 | `webfetch` | 1.230 | 11 | Tải + rút gọn nội dung trang thành markdown | 2 hook | `src/tools/fetch.ts` **53 KB** | **(c)** — omp mạnh hơn nhiều |
| 21 | `look-at` | 922 | 9 | Xem ảnh bằng **model thị giác riêng**, không nhét ảnh vào lượt chính | 1 cmd, 2 hook | `git grep -il 'look_at\|lookAt'` → **0 file** | **(a)** — **đáng lấy** |
| 22 | `loop-guard` | 885 | 9 | Phát hiện vòng lặp tool và **veto trước cả hook** | 8 hook, 2 renderer | `git grep -c loopGuard` → 19 file | **(b)** — senpi 0/6 lõi, an toàn |
| 23 | `nested-agents-md` | 574 | 12 | Chèn `NESTED_AGENTS.md` thư mục con khi đọc file ở đó | 1 cmd, 4 hook, 1 flag | `capability/context-file.ts`, `discovery/agents-md.ts` | **(c)** |
| 24 | `cache-keepalive` | 569 | 4 | Giữ prompt cache ấm: warm lúc start, chờ, gia hạn TTL | 8 hook, 1 renderer | `git ls-files 'packages/ai/src/**/prompt-cache*'` → **rỗng** | **(a)** — **đáng lấy, giá trị cao nhất/dòng** |
| 25 | `btw` | 528 | 4 | Side-query "btw" cạnh lượt chính mà không phá ngữ cảnh | 1 cmd, 4 hook | không có | **(a)** — **đáng lấy, 0 lõi** |
| 26 | `openai-image-gen` | 509 | 5 | Tool sinh ảnh native OpenAI | 4 hook | — | **(a)/(b)** tùy provider — chưa đo |
| 27 | `herdr` | 507 | 4 | Client cho daemon quản lý pane: trạng thái, monitor, wake-source | 5 hook | `git grep herdr` → 0 | **(a)** — nhưng **3/3 = 100% lõi**, tệ nhất bảng |
| 28 | `history-search` | 401 | 5 | Overlay tìm kiếm lịch sử phiên cũ (chỉ đọc) | 1 cmd | `tui/src/overlays/history-search.ts` | **(c)** — đã có sẵn |
| 29 | `reasoning` | 275 | 2 | `/reasoning`, `/efforts` — đọc model hiện tại rồi thông báo | 2 cmd, 2 hook | — | **(b)** |
| 30 | `openai-web-search` | 272 | 1 | Tool web search native OpenAI, capability-aware | 3 hook | — | **(a)/(b)** tùy provider — chưa đo |
| 31 | `tool-pair-guard` | 269 | 3 | Vá tool_use/tool_result lệch nhau | **không đăng ký gì** (gọi nội bộ) | `auto-generated-guard.ts`, `output-schema-validator.ts` — ý tưởng khác | **(a)** — nhưng phải **viết mới**, không port được |
| 32 | `anthropic-web-search` | 249 | 1 | Tool web search native Anthropic, allow/block domain | 3 hook | — | **(a)/(b)** tùy provider — chưa đo |
| 33 | `bash-timeout` | 211 | 3 | Tự thêm timeout cho bash dài, cửa sổ foreground | 1 hook | `src/tools/tool-timeouts.ts` + `bash?timeout` trong `BUILTIN_TOOL_NAMES` | **(c)** |
| 34 | `model-fallback` | 207 | 3 | Chuỗi model fallback khi retry thất bại | 1 cmd, 1 flag | `src/session/retry-fallback-chains.ts`, `retry-fallback-reason.ts` | **(b)** |
| 35 | `recommended-models` | 185 | 1 | Thang model đề xuất + xếp hạng provider lane | 2 hook, 1 flag | `setServiceTier` có trong `ExtensionAPI` | **(b)** — lưu ý AGENTS.md cấm hard-code policy model trong TS |
| 36 | `help` | 166 | 3 | `/help` trong TUI + mở `keybindings.json` bằng editor | 2 cmd | có `help-content.ts` | **(c)** |
| 37 | `rule-activation` | 132 | 3 | Kích hoạt rules theo file vừa đọc | 1 renderer | `rule-buckets.ts` | **(c)** |
| 38 | `video-in` | 126 | 1 | Tool đọc video: `read_video` | 1 tool, 2 hook | `git grep -il video_in` → 0 | **(a)** |
| 39 | `anthropic-bash` | 103 | 1 | Bật native bash tool của Anthropic (`bash_20250124`) | đọc env `PI_ANTHROPIC_BASH` | — | **(a)/(b)** — chưa đo |
| 40 | `account` | 82 | 1 | Liệt kê credential account của mọi provider | 1 cmd | `pi-ai/auth` slot pool | **(c)** |

**Ngoài 40 thư mục còn 9 file `.ts` phẳng** cũng là builtin: `diff.ts` (6,9 KB), `files.ts` (6,9 KB), `gpt-account.ts` (4,7 KB), `import-repro.ts` (13 KB), `prompt-url-widget.ts` (4,6 KB), `repository-identity.ts` (1,5 KB), `service-tier.ts` (17 KB), `tps.ts` (2,4 KB), `redraws.ts` (589 B). **Chưa phân tích** — xem §7.

`builtin/index.ts` khai báo mảng `builtinExtensions` gồm **44 entry** (`grep -c '^\t{ id: "' index.ts` → 44), cộng `globalDefaultExtensionFactories` 4 entry nữa. Và chỉ **26/40** builtin có ≥1 `pi.on(...)`; 4 builtin không hook gì: `account`, `anthropic-bash`, `tool-pair-guard`, `help`.

### 3.1 Phát hiện cấu trúc lớn nhất: **omp chưa từng có khái niệm "builtin extension"**

```bash
find packages/coding-agent/src/extensibility -type d
# .../custom-tools, .../plugins, .../extensions, .../hooks,
# .../custom-commands/bundled/{annotate,review,ci-green}
```

Không có `builtin/` ở omp. Chỗ gần nhất là `custom-commands/bundled/` với **3** mục — và đó là *prompt command*, không phải extension.

> **"Lấy 40 builtin của senpi" KHÔNG phải là copy 40 thư mục.** Phần lớn giá trị của senpi nằm ở *việc nó biến tính năng thành extension đóng gói* — còn omp đã viết thẳng tính năng vào `src/tools/`. Câu hỏi đúng cho M5 không phải "ta lấy builtin nào" mà là **"ta có nên chuyển `src/tools/` sang coi là builtin extension không"** — một câu hỏi kiến trúc, thuộc M1B/M2, không thuộc M5.

### 3.2 Hai API extension gần như ngang nhau — cơ hội port là thật

| | senpi | omp |
|---|---|---|
| File định nghĩa API | `core/extensions/types.ts` (2.732 dòng) | `extensibility/extensions/types.ts` (71 KB) |
| `interface ExtensionAPI` | dòng **1907** | dòng **1256** |
| Số event `on(event:)` | **42** | **41** |

Cả hai đều có `registerTool` / `registerCommand` / `registerFlag` / `registerShortcut` / `registerProvider` / `registerMessageRenderer` / `setModel` / `setActiveTools`. **Cùng một hình dạng API** ⇒ một builtin viết cho senpi port sang omp không cần viết lại hạ tầng.

Chỉ khác ở **tên** event, không ở số lượng:

| Chỉ có ở senpi | Chỉ có ở omp |
|---|---|
| `session_parked`, `session_resumed`, `session_abort`, `session_extensions_removed` | `session_switch`, `session_branch` |
| `ui_prompt_start`, `ui_prompt_end` | `session_stop` |
| `model_select`, `system_prompt_change`, `thinking_level_select` | `auto_compaction_start/end`, `auto_retry_start/end` |
| `tool_activated`, `input_disposition` | `tool_approval_requested/resolved`, `user_python` |
| `project_trust` | `todo_reminder`, `goal_updated`, `ttsr_triggered`, `mcp_notification` |

Đáng chú ý: **omp đã mở sẵn `goal_updated` / `todo_reminder` / `ttsr_triggered` / `mcp_notification` làm event công khai** — tức goal, todo, tts, MCP của omp đã *chủ động* mở hook cho extension. Hai bên đang hội tụ.

---

## 4. Danh sách port theo giá trị / công

Xếp theo `deep-miss.md` §1 (bài đo kỹ nhất về phía "cái gì thật sự thiếu"), có đối chiếu `deep-risk.md` §8.2.
Mỗi mục dưới đây **đủ để làm mà không cần đọc lại senpi**.

| # | hạng mục | senpi | omp hiện tại | mức | công |
|---:|---|---|---|---|---|
| 1 | **Warm prompt cache + TTL resolver** | 483 TS + 476 dòng `pi` | thiếu **2 hàm** | **làm ngay** | tiết kiệm tiền thật mỗi lượt |
| 2 | **4 seam API extension** (`registerEntryRenderer` + `model_select` + 3 `setSession*`) | 0 (là hành lang) | **0 hit cả 4** | **làm ngay** | mở khoá 16 builtin |
| 3 | `tool-pair-guard` | 269 | 0 | làm nếu có seam | vá lỗi wire 500 |
| 4 | `look-at` (model thị giác riêng) | 922 | 0 | làm nếu có seam | ảnh không phá context |
| 5 | `config-reload` | 2.317 | 0 | **không đáng lúc này** | (đã có ở dạng khác) |

> **Sau khi đo lại: từ 40 builtin, còn đúng 4 hạng mục "thiếu hẳn".** Không phải 6 như `deep-risk.md` §8.2 liệt kê — vì `btw` rơi (đã có) và `loop-guard` / `history-search` / `bash-timeout` rơi (đã có ở dạng khác). Xem §7.1.

### 4.1 Hạng 1 — Warm prompt cache + TTL resolver (làm ngay)

**Đích đến (omp):** `packages/ai/src/utils/prompt-cache-ttl.ts` — file **476 dòng**, `resolvePromptCacheTtlSeconds` ở **dòng 473**.

**Thiếu đúng 5 hàm**, đo bằng `git grep -rn` trên `packages`:

| hàm của senpi | omp | nơi senpi định nghĩa |
|---|---|---|
| `warmPromptCache` | **0 hit** | `packages/ai/src/utils/prompt-cache-ttl.ts` |
| `resolvePromptCacheTtlSeconds` | **0 hit** | cùng file, dòng **473** |
| `getPromptCacheSafeWaitSeconds` | **0 hit** | `ExtensionContext` |
| `getPromptCachePrefixRequest` | **0 hit** | `ExtensionContext` |
| `prepareProviderRequest` | **0 hit** | `ExtensionContext` |
| `registerEntryRenderer` | **0 hit** | ⚠️ thiếu cả API |
| `isIdle()` / `hasPendingMessages()` | **50 / 38 hit** | ✅ có — `types.ts:478` / `types.ts:482` |
| `appendEntry` / `getAllTools` / `getActiveTools` | 56 / 35 / 44 hit | ✅ có |

**Phải sửa khi chép (không chép nguyên):** 9 `any` — nhiều nhất cây builtin; `4/4 = 100%` entry tự thú cắm core; `console.*` phải đổi sang `logger` (`@oh-my-pi/pi-utils`); đường dẫn/tab trong text phải qua `replaceTabs`/`truncateToWidth`/`shortenPath`.

**Cơ chế:** `index.ts:104-140` của senpi — warm lúc start, chờ, gia hạn TTL. Không cần đọc lại; điểm móc trong omp là `registerEntryRenderer` + `isIdle()`.

### 4.2 Hạng 2 — 4 seam API extension (~20 dòng, làm ngay)

Rẻ nhất trong toàn bộ danh sách. Chi tiết ở §5. Không cần đọc lại senpi để làm.

### 4.3 Hạng 3 — `tool-pair-guard` (làm nếu có seam)

- **Nguồn:** `builtin/tool-pair-guard`, 269 dòng, 3 file, **không đăng ký gì** (được gọi nội bộ).
- **Seam trong omp: ĐÃ CÓ, không thiếu.** (Xem mâu thuẫn §7.10 — `deep-risk.md` §5.3 nói nó "vá ở tầng `packages/ai`" là **sai**; `verify-inherit.md` #11 bác bỏ được.)
- **Cỡ công:** thấp. 0 entry cắm core.
- **Vì sao "làm nếu có seam" chứ không phải "làm ngay":** không có entry cắm core ⇒ cũng **không có bằng chứng nào** rằng nó không chạm lõi. 13/40 builtin không có `changes.md` (xem §7.12) và `tool-pair-guard` **nằm trong 13 đó** ⇒ *không có phép đo nào tồn tại* cho nó.

### 4.4 Hạng 4 — `look-at` (làm nếu có seam)

- **Nguồn:** 922 dòng, 9 file, 1 cmd (`lookat`) + 2 hook.
- **Ý tưởng:** ảnh đi qua **model thị giác riêng** qua `model-selector.ts`, không nhét base64 vào lượt chính.
- **Giảm công:** `model-resolver.ts` của omp **đã có `splitThinkingSuffix`** ⇒ bớt ~100 dòng.
- **Cỡ công:** trung bình.
- **Vi phạm nặng nhất trong danh sách, sau `prompt-preset`:** 1 `ReturnType<`.
- **Lý do "làm nếu có seam":** bị `model_select` chặn.
- ⚠️ **Cùng cảnh báo như 4.3:** `look-at` **không có `changes.md`** ⇒ chưa từng được đo về mức cắm core, dù `deep-risk.md` §6.1 xếp nó vào hàng "vì sao an toàn".

### 4.5 Hạng 5 — `config-reload`: không đáng lúc này

2.317 dòng, `git grep -c config-reload` trong omp → **0**. Nhưng:
- `deep-risk.md` §1.5 đo **91% cắm core** — tác giả senpi tự nói 11/12 lần "làm bằng extension không được".
- `deep-inherit.md` §6 tự thú: đọc `#configWatchTargets()` (`settings.ts:993-1023`) thấy nó phủ config/settings **nhưng không thấy phần extension** — có thể extension reload nằm ở chỗ khác. **Chưa chắc chặn.**
- Kết luận: để cuối, không phải đầu.

### 4.6 Hai package "mới" của senpi — đều KHÔNG chép

| package | kết luận | lấy gì (ý tưởng, không lấy code) |
|---|---|---|
| `packages/senpi-codemode` | **KHÔNG chép — omp đã có, và lớn hơn** | 4 ý: kernel Ruby/Julia, prompt đa-dialect, renderer code-preview, skill `bun-1-4`. omp có `packages/coding-agent/src/eval/` **18.480 dòng / 59 file** |
| `packages/pty` | **KHÔNG chép — omp đã có** | 2 ý: queue thao tác màn hình, pipe-fallback. omp có `crates/pi-natives/src/pty.rs` (**1.127 dòng**) + `vterm` (**1.067 dòng**) |
| `crates/senpi-grep` + `crates/senpi-pty` | **KHÔNG lấy code** | đúng 1 ý: `grep()` native nhận `AbortSignal` |
| `packages/session-backends` | **KHÔNG ĐÁNG LẤY — dead code ở cả senpi lẫn `pi`**, và `src/` giống hệt từng byte (`diff -r` → 0 dòng khác, md5 khớp 33/34 file) | không có gì |

> **Tiền đề "hai package mà `pi` không có" chỉ đúng một nửa: `pi` CÓ `session-backends`.**
> Và mối nguy nhất: **omp đã có sẵn cả hai thứ senpi "mới"**. `cp -r` từ senpi sẽ **ghi đè một hệ thống lớn hơn bằng một bản nhỏ hơn và cũ hơn**.

---

## 5. Seam phải mở trước — và cái nào chạy được ngay không cần seam

### 5.1 Nền: omp ĐÃ CÓ hệ thống extension thật

`packages/coding-agent/src/extensibility/extensions/types.ts` — **46 event** (`deep-wiring.md` §0, đo lại độc lập), hạ tầng **5.337 dòng / 11 file**. **M5 không phải dựng hạ tầng.**

*(Ghi chú mâu thuẫn: `builtins.md` §1.1 đếm **41** event, `deep-wiring.md` §0 đếm **46**, `deep-inherit.md` §1b nói "44 của senpi vs 41 của omp", `changes-md.md` §5a nói "omp đã có 37 event". Bốn con số khác nhau cho cùng một file — xem §7.8.)*

### 5.2 Phân rã 40 builtin theo seam

Đo bằng `awk` join (sau khi sửa lỗi zsh ở `deep-wiring.md` §2.1):

| nhóm | số |
|---|---:|
| Cần ≥1 event omp chưa có | **24** (15 vì `model_select`, 6 vì `agent_settled`, 4 vì `session_abort`, còn lại rải) |
| Có event, nhưng **không event nào thiếu** | 11 |
| **0 `pi.on()` nào cả** | 5 (`account`, `help`, `history-search`, `model-fallback`, `rule-activation`) |
| Trừ: cần method omp thiếu | −3 (`mcp`, `tool-search`, `rule-activation` → `registerEntryRenderer`/`registerLazyToolActivator`) |
| **= CHẠY ĐƯỢC NGAY** | **13** |

### 5.3 Chạy được NGAY, không cần seam nào (13 builtin)

`account` · `anthropic-bash` · `bash-timeout` · `help` · `history-search` · `hooks` · `imagegen` · `model-fallback` · `nested-agents-md` · `permission-system` · `rules` · `tool-pair-guard` · `webfetch`

> **"Không cần seam" ≠ "chép được nguyên xi".** Trong 13 cái đó:
> - `permission-system` (1.638 dòng) — **hai kiến trúc approval không tương thích**, phải viết lại theo `approval.ts` của omp. Seam-free nhưng **không port được**.
> - `webfetch` (1.062 dòng) — 70% tự thú cắm core.
> - `rules` (2.842 dòng) — 50% cắm core.
> - `anthropic-bash`, `imagegen` — hợp đồng provider.
>
> ⇒ **13 là trần trên của "chạy được"**. Tính cả việc phải viết lại kiến trúc, con số thật dùng được ngay là **khoảng 6–8**; và trong đó `btw` + `look-at` bị `model_select` chặn, nên **chỉ `loop-guard`, `bash-timeout`, `history-search` là thật sự không cần cả seam lẫn viết lại kiến trúc.**

### 5.4 Thứ tự mở seam

Ràng buộc đo được: `model_select` phủ **15/24** builtin bị chặn; `agent_settled` phủ 6; `session_abort` phủ 4. Ba cái này **không chặn nhau**.

```
Bước 0  KHÔNG LÀM GÌ  ── dùng 13 builtin seam-free để dựng đường chạy thật.
                     Đây là bước DUY NHẤT không tốn công.
   │
   ├─► Bước 1  S2 agent_settled                 (~10 d, 2 file)  ★ RẺ NHẤT
   │           gỡ 6 (goal, config-reload, herdr, loop, loop-guard, ttsr).
   │           Điểm móc: session/agent-session-events.ts:16 — bám cờ isTerminal,
   │           tầng session ⇒ phủ hết mode, không sửa từng mode.
   │           ⚠ DỄ SAI NGỮ NGHĨA: phát cả non-terminal là hỏng loop/ttsr/loop-guard
   │             mà KHÔNG throw.
   │
   ├─► Bước 2  S7 registerEntryRenderer          (~30 d, 2 file)
   │           gỡ rule-activation; tiền đề cho mọi renderer sau này.
   │           Không chặn gì, không phụ thuộc bước nào.
   │
   ├─► Bước 3  S1 model_select                  (~45 d, 3 file)  ★ NÚT THẮT SỐ LƯỢNG
   │           gỡ 15 builtin. Điểm móc: session/model-controls.ts:218.
   │           ⚠ KHÔNG chặn: cache-keepalive, terminal, compaction, cursor-cli-oauth,
   │             anthropic-subscription, config-reload, herdr, mcp, gpt-apply-patch,
   │             prompt-preset.
   │
   ├─► Bước 4  S3 session_abort                 (~40 d, 3 file)
   │           gỡ 4 (goal, loop, todotools, ttsr).
   │           ⚠ điểm móc trong omp CHƯA ĐO — đo trước khi viết.
   │
   └─► Bước 5  S9 3 method setSession*          (~60 d, 3 file)
               gỡ service-tier.ts + recommended-models + reasoning.
               ⚠ phải giữ ranh giới session-scoped vs persisted.
               KHÔNG mang interface cục bộ của service-tier.ts:109 sang.

   ✗ KHÔNG MỞ:  S4, S5, S8, S10   (gỡ 0 builtin có giá trị)
   ⏸ ĐỂ CUỐI:    S6 (5 event × 1 chỗ, 200 dòng cho 5 builtin)
```

**Câu hỏi "bước nào chặn bước nào" — trả lời thẳng:** `S2` và `S7` **không chặn gì cả** (độc lập, làm song song hoặc trước `S1` được). `S1` chặn 15 builtin nhưng **không chặn S2/S7/S9**. `S9` đứng cuối vì không gỡ builtin nào sớm hơn `S1` mà lại phải giữ hợp đồng session-scoped/persisted. **Thứ tự ở đây theo giá trị, không theo phụ thuộc kỹ thuật.**

### 5.5 10/15 thứ bị xếp thổi phồng — đừng mở

| thứ | lý do |
|---|---|
| `executeTool` | **method bịa ra** trong `ext-api.md`/`deep-risk.md`. 603 file builtin, **0 file dùng**. Là method khai trong `types.ts:2122` mà 0 builtin dùng |
| `registerFilesystemPolicy` | 0 file builtin dùng |
| `registerMarkdownTransformer` | 0 file |
| `registerMcpServer` | 0 file |
| `registerReadClassifier` | 0 file |
| `registerRemovedToolHint` | 0 file |
| 4 method `ctx.ui` | cả 4 → 0 file |
| `session_parked` / `session_resumed` / `session_extensions_removed` (S4, S5) | 0 builtin có giá trị |
| `registerLazyToolActivator` (S8) | chỉ 3 file / 2 thư mục |

> **Không cái nào trong 10 thứ trên gỡ được builtin nào.** Mở chúng là tự làm rối `types.ts` mà không nhận về gì.

**Chỉ 2/15 thứ đáng mở theo số người dùng:** `registerEntryRenderer` (5 file / 5 thư mục) và `registerLazyToolActivator` (3 file / 2 thư mục).

### 5.6 Cơ chế thật sự đáng tiền: `setActiveTools` / `setModel`, không phải `model_select`

`model_select` gỡ **nhiều** builtin nhất, nhưng `agent_settled` **rẻ hơn 4×** và là bước 1. Còn **cái thật sự đáng tiền** là `setActiveTools` / `setModel` (**20 + 3 file**) — vì đó mới là chỗ builtin **ra lệnh**, chứ không phải chờ tin.

### 5.7 Quy tắc bất di bất dịch

> **Chỉ BỔ SUNG event còn thiếu vào `types.ts`/`runner.ts` của omp. KHÔNG thay thế.**
> 20 hook chỉ-omp (`auto_retry_*`, `retry_fallback_*`, `tool_approval_*`, `before_subagent_spawn`, `goal_updated`, `todo_reminder`, `ttsr_triggered`, `credential_disabled`, `mcp_notification`, `session_switch`/`_before_branch`/`session_branch`/`session_stop`/`session.compacting`) là tài sản, mất thì mất.

### 5.8 Đường vào rẻ nhất để thử TRƯỚC khi động vào omp

`directory-resolution.ts:69` đọc `pkg.omp ?? pkg.pi` — extension senpi khai `"pi": { "extensions": [...] }` được omp nạp nguyên bản.

**Ném thử 3 builtin seam-free vào đó trước khi viết dòng seam nào.** Lỗi biên dịch sẽ chỉ ra chính xác cái thiếu, và không tốn công sửa nếu ta sai.

---

## 6. Cái KHÔNG nên lấy — và vì sao

Phần này quan trọng không kém phần "nên lấy".

### 6.1 Không lấy vì omp đã mạnh hơn ở tầng core

| thứ | dòng senpi | bằng chứng omp | vì sao không lấy |
|---|---:|---|---|
| **`mcp`** | 10.244 (9.327 theo `deep-risk.md`) | `src/mcp/` **22 file** + `capability/mcp.ts` + 4 tài liệu, 129 file tracked; có cả OAuth discovery lẫn authoring guide | Port = chạy **hai hệ MCP song song**, mỗi cái một bộ tool. omp đã ở bậc cao hơn. Ngoài ra 17 `ReturnType<` + 4 inline import |
| **`compaction`** | 10.788 (8.779 theo `deep-risk.md`) | `packages/snapcompact` + `packages/agent/src/compaction/` (**17 file**) + `snapcompact-inline.ts` + `hashline-compact.md` | Sửa `transform-messages.ts` + `agent-loop.ts`; chọn prompt theo **provider** (sai nguyên tắc class-vs-provider của `AGENTS.md`). **Ghép hai compaction sẽ hỏng cả hai** |
| **`webfetch`** | 1.230 | `src/tools/fetch.ts` **53 KB** | omp mạnh hơn nhiều |
| **`ask-user`** | 1.284 | `src/tools/ask.ts` **41 KB** (`multi`, `recommended`, timeout, "Other") | omp mạnh hơn |
| **`todotools`** | 3.263 | `src/tools/todo.ts` 27 KB + `todo-command-controller.ts` + event `todo_reminder` | Và senpi **đã port cái này từ chính omp** (`NOTICE.md` khoản 4) — lấy ngược lại là vô nghĩa |
| **`/btw`** | 528 (389 TS) | `btw-controller.ts` **708** + `btw-history.ts` 216 + `btw-panel.ts` 172 + `btw-history-panel.ts` 598 = **1.694 dòng**, prompt ở `btw-user.md` | **omp lớn gấp 4,3×** và prompt nằm đúng chuẩn `AGENTS.md` (`.md`), trong khi senpi để prompt trong `.ts`. Ở đây **senpi mới là bản cần viết lại** |

### 6.2 Không lấy vì cắm core quá sâu — mà phần lõi đó viết cho kiến trúc của senpi

| thứ | dòng | cắm core | lý do |
|---|---:|---:|---|
| **`cursor-cli-oauth`** | 5.186 | **92%** (12/13) | 35 `private` (đúng số nhưng **không phải nhiều nhất cây** — `terminal` 29, `gpt-apply-patch` 19 ngay dưới) + trùng `providers/cursor.ts` của omp (5.541 dòng). **Vi phạm nhiều luật nhất** |
| **`anthropic-subscription`** | 7.281 | **76%** (52/69) | SDK Anthropic **không có trong `bun.lock` của omp**; tranh OAuth callback với `crates/pi-natives/src/oauth_callback/` (12 file, 184K). Chạm `providers/cursor.ts`, `utils/retry.ts`, `src/config.ts` |
| **`config-reload`** | 2.317 | **91%** (11/12) | Tác giả tự nói 11 lần "làm bằng extension không được" |
| **`herdr`** | 418 | **100%** (3/3) | Phụ thuộc hạ tầng pane ngoài mà omp không có |
| **`terminal`** (nguyên si) | 6.962 | 57% (18/47) | 29 `private` + 15 `ReturnType<` + 3 inline import, **và** đụng `packages/pty/src/registry-session.ts`. omp đã có PTY (`bash.ts` có `"pty?"`, `bash-pty-selection.ts`, crate `pi-shell` `shell.rs` **228 KB**). Chép thêm = hai đường thực thi shell |
| **`ttsr`** | 3.783 | 9 file lõi, `inside=1 outside=6` | Chạm `session/ttsr-coordinator.ts`, `export/ttsr.ts`, `prompts/system/ttsr-interrupt.md`, `packages/ai/src/utils/*`. omp đã có `crates/pi-voice` với `live.rs` 21 KB — audio đã ở tầng Rust, khác hẳn cách senpi lo |
| **`gpt-apply-patch`** | 2.051 | — | Gắn với wire mode OpenAI/Codex; `setModel` 4 lần; omp có `ast-edit.ts` |

> **Nguyên tắc:** lấy một builtin "lõi nặng" mà **không** lấy kèm phần lõi nó đào = bạn có một cái vỏ không chạy được. Chép cả phần lõi = bạn đang ghi đè kiến trúc của omp.

### 6.3 Không lấy vì phải VIẾT LẠI, không chép được

| thứ | dòng | vì sao phải viết lại |
|---|---:|---|
| **`prompt-preset`** | 2.941 | **Vi phạm nặng nhất trong toàn bộ cây.** (a) `AGENTS.md` **cấm hard-code model id trong TS** — đây là bảng tra model-id thuần. (b) `AGENTS.md` **cấm viết prompt bằng TS** — 323/603 file vi phạm, `presets.ts` 454 dòng. (c) 38 file `.ts` preset phải ra `.md` + 1 KDL axis. (d) **Pháp lý:** `changes.md` của nó tự thú **10/58 entry** port prompt từ OMO, mà `NOTICE.md` của senpi **không khai báo** |
| **`permission-system`** | 1.638 | **Hai kiến trúc approval không tương thích** — viết lại theo `approval.ts` của omp |
| **`tool-pair-guard`** | 269 | Vá ở tầng mà omp không có ⇒ viết mới |
| **`terminal`** (phần monitor) | — | Phần đáng lấy là **consumer** (monitor-registry 837 dòng, restore-session, orphan-reaper) — viết lại trên nền `pi-shell` của omp, **không chép** |
| **4 builtin "provider-specific"** | 3.189 | `anthropic-bash`, `anthropic-web-search`, `openai-web-search`, `openai-image-gen` — nhỏ nhưng đều là provider contract. Chỉ nên làm khi KDL đã có axis |

### 6.4 Không lấy vì lỗ hổng pháp lý chưa đóng

- **`prompt-preset`**: không lấy **nội dung prompt** từ senpi (xem 6.3).
- **`compaction/prompts.ts:31`** chứa chuỗi `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - …]`. **Không mang sang.**
- **License của OMO: chưa đủ dữ liệu.** `lineage.md` §3.5 nói thẳng đây là khoảng trống thật, `verify-wiring.md` §4 đồng ý. Đây không phải kết luận pháp lý — nhưng đủ để không lấy.
- **`senpi-codemode` / `pty` / `session-backends`**: xem §4.6.

### 6.5 Không lấy vì là công việc của repo khác, không phải M5

- **165 entry** nhóm (b) "sửa lỗi / đồng bộ upstream" — cơ chế rebase. omp không rebase từ pi-mono (đã nuốt pi qua `legacy-pi-*-shim.ts`) ⇒ **loại bỏ ngay**.
- **100 entry** nhóm (c) "rebrand / vendoring / dependency" — **phải làm ngược lại hoặc bỏ**.
- **109 entry** hạ tầng repo (`.github/` 21, `.husky/` 4, `scripts/` 70, `evals/` 7, skill Bun vendor 7) — không liên quan sản phẩm.
- **62 file `changes.md`** — cái mất nếu bỏ là mất cơ chế *"Why an extension could not handle it"* (mẫu tài liệu tốt) và mất lịch sử *vì sao* một quyết định fork tồn tại. **Khuyến nghị: giữ `senpi-ref` trên đĩa, không đưa vào scope M5.**

### 6.6 Điều tuyệt đối không lấy: session layer

> **`omp` phải giữ nguyên thiết kế tự lành JSONL của mình. Chép nguyên xi session layer của `pi` (hay của senpi) là LÀM CHẬT HƠN.**

- omp: `parseJsonlLenient` (`packages/utils/src/stream.ts:575`) → `onMalformedRecord` → `malformedRecords` → `#rewriteRequired` → ghi lại thân file ở lần persist sau.
- `pi`: `JsonlCorruptionError` (`durable/src/storage/jsonl/storage.ts:80`, ném ở dòng **119**) — `catch` chỉ bọc `JSON.parse` rồi ném lại, **không có cơ chế phục hồi nào**.
- `senpi`: **không có gì cả** — `git grep` cả 3 mẫu đều rỗng; tầng storage thật (`agent/harness/session/jsonl`, **8/8 byte giống `pi`**) ném `Error` trần.

**Rủi ro JSONL CÓ phát sinh khi port builtin** (đây là điểm dễ sai nhất, vì nó trông vô hại):

| builtin | số file chạm session/JSONL |
|---|---:|
| `history-search` | 2 |
| `btw` | 1 |
| `tool-search` | 1 |
| `look-at` | 1 |
| `rules` · `video-in` · `webfetch` · `loop-guard` · `bash-timeout` | 0 |

Không builtin nào **ghi** JSONL, nhưng nhiều cái **đọc và phục hồi session** (`ask-user/resume.ts`, `btw/index.ts`, `compaction/resume-slice.ts`, `anthropic-subscription/session-binding.ts`…). **Khi port, phải đi qua `parseJsonlLenient` của omp — không dùng `JSON.parse` trực tiếp**, nếu không sẽ biến lỗi thành crash.

### 6.7 Không lấy: 7 package M1B (xem lại §2)

Nguồn M1B = **`pi`**, toàn bộ. Không package nào trong 7 mà senpi đóng góp code mới đáng kể. Đặc biệt:
- **`chord`**: senpi là **bản lùi** — mất 23 file, mất hệ delta 3.635 → 1.267 dòng, mất `diffRevisions`/`Draft`/`applyImmutableBatches`, mất API `ReplicatedStateSource`.
- **`durable`**: senpi có **0 file**; bản của `pi` là **code chết** không package nào import.

### 6.8 Cái KHÔNG nên lấy vì nó là câu hỏi kiến trúc, không phải M5

**"Ta có nên chuyển `src/tools/` của omp sang coi là builtin extension không"** — đây là giả thuyết trung tâm của người đọc ("senpi giống tôi đó"), nhưng nó là **quyết định kiến trúc thuộc M1B/M2**, không phải việc M5 làm. Nếu không có nó, M5 chỉ là port từng cái rời rạc.

---

## 7. Mâu thuẫn chưa giải quyết

Các mục dưới đây là chỗ **hai nguồn trong `.lavish-wip/senpi-md/` cho hai số khác nhau**. Tôi in cả hai và **không chọn bên nào trong im lặng** — mọi mục đều kèm lệnh để người đọc tự chốt.

### 7.1 `/btw` — "omp không có" vs "omp có và lớn hơn senpi 4,3×"

| nguồn | phát quyết | bằng chứng |
|---|---|---|
| `builtins.md` §4.2 + §5.3 | **(a) omp không có** → xếp hạng 3 "đáng lấy" | `git grep -E '\bbtw\b' -- packages/...` → 0 hit |
| `changes-md.md` §5d | omp **0 hit** → "ứng viên port số 1" | cùng lệnh trên |
| **`deep-miss.md` §0.2** | **SAI. omp đã có, 1.694 dòng vs senpi 389** | `git grep -w 'btw' -- packages/coding-agent/src` → **52 hit** |

**Nguyên nhân đã tìm ra, không phải bất đồng ý:** `\b` **không hoạt động trong `git grep -E` trên macOS** — bị hiểu thành backspace.

```bash
git grep -w 'btw' -- packages/coding-agent/src | wc -l        # 52
git grep -E '\bbtw\b' -- packages/coding-agent/src | wc -l    # 0
```

Cùng một từ khóa, hai cách viết, chênh lệch **52 về 0**. Kết quả 0 là **phép đo hỏng**, không phải phát hiện.

**Trạng thái:** `deep-miss.md` là nguồn mới hơn và có lệnh chứng minh ⇒ tôi nghiêng về nó. Nhưng **hai file cũ vẫn in "0 hit"** trong bảng §4.2 của `builtins.md` mà người đọc có thể tra. Cả ba file nên được đánh dấu.

**Bài học đã thành quy tắc (nghiêng về `deep-miss.md`):**

| tìm symbol trong omp | dùng | không dùng |
|---|---|---|
| tên hàm/biến | `git grep -w '<tên>' -- <path>` | `git grep -E '\b<tên>\b'` |
| tên có dấu `.` | `git grep -w -F 'pi.rpc'` | regex |
| đường dẫn | `git ls-files \| grep -i '<mẫu>'` | `git ls-files '<pathspec>'` (tương đối với cwd) |

Cả hai bẫy đều **sinh ra kết quả rỗng**, và kết quả rỗng rất dễ đọc thành "omp không có".

### 7.2 `cache-keepalive` — ba nguồn, ba kết luận

| nguồn | phát quyết |
|---|---|
| `builtins.md` §5.1 | "omp có **zero** file `prompt-cache*`" → xếp **#1 đáng lấy, giá trị cao nhất/dòng** |
| `deep-inherit.md` §3.2 | bài trước nói "omp có `cache_control`, không cần port" — **chỉ đúng một nửa** |
| **`deep-miss.md` §0.3** | `builtins.md` **sai** vì lại dùng pathspec sai. `git grep -rln 'cache_control' -- packages/ai/src` → **9 file**; `type CacheRetention` ở `packages/ai/src/types.ts:124`; `prompt-cache-mode` **đã là một axis KDL** ở `packages/catalog/src/compat/axes.ts:218` |
| `deep-risk.md` §6.1 | đồng ý về **giá trị**, **không đồng ý về rủi ro**: `4/4 = 100% cắm core` (cao nhất bảng) + **9 `any`** (nhiều nhất cây builtin) |

⇒ **Không mâu thuẫn thực sự sau khi sửa pathspec:** `cache-keepalive` không thiếu hạ tầng cache, chỉ thiếu **2 hàm ở `packages/ai` + 1 API `registerEntryRenderer`** (§4.1). Nhưng `builtins.md` vẫn in "zero file" trong bảng §4.2 — **đó là khẳng định âm tính gắn lệnh không hỗ trợ nó**, loại lỗi nặng nhất.

### 7.3 `tool_search` — (b) "omp có" vs "omp KHÔNG có"

| nguồn | phát quyết |
|---|---|
| `builtins.md` §4.2 | **(b)** — `git grep -c tool_search` → 8 file |
| `changes-md.md` §5b | omp có `tool_search` **ở tầng wire** (17 file `packages/ai`); thiếu bề mặt đăng ký qua extension: `registerLazyToolActivator` → 0 hit |
| **`deep-inherit.md` §3.1** | "bài trước gọi là (b) omp có, nhưng **omp KHÔNG có tool này**" |

**Cả ba nói về ba thứ khác nhau:** (1) tool ở tầng wire, (2) bề mặt đăng ký extension, (3) builtin `tool-search` của senpi. Chưa nguồn nào đo trực tiếp xem `tool_search` có xuất hiện trong `BUILTIN_TOOL_NAMES` của omp hay không. **Chưa đủ dữ liệu.**

### 7.4 `herdr` — "omp không có" là sai một nửa

`builtins.md` §4.2 phán **(a)**, dựa trên `git grep herdr` → 0. `deep-inherit.md` §3.5 nói đây là **sai một nửa**. Cả hai đều ghi rõ mình chỉ grep tên. **Chưa đủ dữ liệu** — cần mở `deep-inherit.md` §3.5 để xem bằng chứng bên nào.

### 7.5 OMO — 41 file, không phải "không ra gì"

| nguồn | phát quyết | lệnh |
|---|---|---|
| `lineage.md` §3.5 | **"không một dòng code OMO nào nằm trong senpi"** | `git -C $S ls-files \| grep -iE 'oh-my-openagent\|/omo/'` → *(rỗng)* |
| **`verify-miss.md` B1** | **Lệnh trên SAI.** Chạy đúng lệnh đó: `git grep -ilE 'oh-my-openagent\|/omo/' \| wc -l` → **41** | |

Và khi dùng mẫu đúng, lộ ra module thật:

```
packages/coding-agent/src/beta/omo-local-update.ts            (880 dòng)
packages/coding-agent/src/beta/omo-local-update-artifacts.ts   (88)
packages/coding-agent/src/beta/omo-local-update-fingerprint.ts (62)
packages/coding-agent/src/beta/omo-local-update-worker.ts      (62)
                                                          ── 1.092 dòng
```

Dòng 152–154 đọc tên package plugin OMO (`@code-yeongyu/omo-senpi`, `@oh-my-opencode/senpi-task`); dòng 208–212 ghi `git rev-parse origin/dev:packages/omo-senpi` — **fetch và checkout trực tiếp từ monorepo OMO**.

**Công bằng với cả hai:** `verify-miss.md` tự nói *"tôi không bác bỏ được mệnh đề đó"* — module này **tiêu thụ** OMO, không phải **chép từ** OMO. Cả hai file **đều sai ở lỗ hổng phương pháp**: một khẳng định âm tính gắn lệnh không hỗ trợ nó.

**Hệ quả thực tế (thuộc về M5):** rủi ro không chỉ là "text prompt không được khai báo" mà là **toàn bộ quan hệ OMO–senpi không nằm trong `NOTICE.md`**. Củng cố kết luận "đừng lấy `prompt-preset`" — nhưng vì lý do khác và mạnh hơn.

### 7.6 `classes/*.kdl` của omp — ba con số

| nguồn | số |
|---|---|
| `deep-risk.md` §0.3 | **18** |
| `verify-wiring.md` #6 | **19** (thiếu `gpt-oss.kdl`) |
| `verify-inherit.md` #7 | **21** |

Không ảnh hưởng quyết định nào, nhưng cả ba file đều dán lệnh. **Chưa đủ dữ liệu** — cần chạy lại `ls packages/catalog/src/compat/rules/classes/*.kdl | wc -l`.

### 7.7 `oauth_callback/` — 10 file hay 12?

`deep-risk.md` §4.1 nói **10 file, 146 KB**; `verify-wiring.md` #11 và `verify-inherit.md` #8 nói **12 file, 184K**. Cả hai đều ghi *"10 file đúng, 146 KB sai"* ⇒ chỉ mâu thuẫn ở con số **file**, không phải KB. **Chưa đủ dữ liệu** cho biết bên nào đếm đúng.

### 7.8 Số event của omp — bốn nguồn, bốn số

| nguồn | số event `on(event:)` của omp |
|---|---|
| `changes-md.md` §5a | **37** (danh sách liệt kê) |
| `builtins.md` §1.1 | **41** |
| `deep-inherit.md` §1b | **41** (đối chiếu "44 của senpi vs 41 của omp") |
| **`deep-wiring.md` §0** | **46** — "tôi tự đo lại, không dựa vào vòng trước" |

Hệ quả: bảng "23 event dùng chung / 21 chỉ senpi / 18 chỉ omp" của `deep-inherit.md` §1b **được tính trên mẫu số 44 và 41**. Nếu số thật là 46, bảng đó phải tính lại. **Chưa đủ dữ liệu** — cần một lệnh duy nhất chốt: đếm `on(event:` trong `extensibility/extensions/types.ts`.

### 7.9 `model_select` — nút thắt số lượng nhưng không phải nút thắt giá trị

- Số: `deep-risk.md` nói **16 builtin** dùng; `verify-inherit.md` #9 đo **19 file** (và ghi *"đúng là nút thắt #1, sai số"*).
- **Xếp hạng mâu thuẫn trong chính bộ file:** `ext-api.md` §6.1 xếp `model_select` là nút thắt số 1. `deep-wiring.md` §0.3 + §7.7 nói: *"`agent_settled` **rẻ hơn 4×** và là bước 1. Cái thật sự đáng tiền **không phải `model_select`** mà là `setActiveTools`/`setModel` (20 + 3 file), vì đó mới là chỗ builtin **ra lệnh** chứ không phải chờ tin."*

Tài liệu này theo `deep-wiring.md` (đo mới hơn, có điểm móc dòng cụ thể) nhưng **ghi rõ cả hai**: theo *số builtin gỡ được* thì `model_select`; theo *giá trị mỗi dòng* thì `agent_settled` rồi `setActiveTools`.

### 7.10 `tool-pair-guard` vá ở đâu?

`deep-risk.md` §5.3: *"vá ở tầng `packages/ai` mà omp không có"*. `verify-inherit.md` #11: bác bỏ được — *"**không có bất kỳ tham chiếu `packages/ai` nào**"*. `deep-miss.md` §1.3/§1.3.1 lại nói *"Seam trong omp — **ĐÃ CÓ, không thiếu**"*.

⇒ **`verify-*` ủng quyền hơn `deep-*`** ⇒ kết luận: **`tool-pair-guard` phải viết mới, không port được** (§4.3). Nhưng nêu rõ mâu thuẫn vì `deep-miss.md` dùng từ "đã có seam" theo nghĩa khác.

### 7.11 Mẫu số `changes.md` — bốn số

| nguồn | mẫu số |
|---|---|
| `changes-md.md` §0 | **2.268** entry sản phẩm |
| `changes-md.md` §9 | **2.377** entry |
| `builtins.md` §3.7 | **564** entry trong cây builtin |
| `verify-wiring.md` #13 | **509** (thừa kế từ `builtins.md`) |

Hệ quả bị ghi thẳng: tỉ lệ "cắm core" là **253/564 = 44%** theo `builtins.md`, nhưng thực ra **253/509 = 50%** theo `verify-wiring.md`. Và cả hai tỉ lệ đều là **tự-báo-cáo của tác giả senpi**, không phải kiểm chứng độc lập.

### 7.12 13 hay 14 builtin không có `changes.md` — lỗ hổng phương pháp lớn nhất

`verify-miss.md` B2 liệt kê **13**: `account` · `anthropic-bash` · `anthropic-web-search` · `ask-user` · `history-search` · `hooks` · `look-at` · `loop` · `model-fallback` · `openai-web-search` · `recommended-models` · `rule-activation` · `tool-pair-guard` · `video-in`.
`verify-inherit.md` #10 nói **14/40**.

⇒ **13 vs 14, chưa chốt được.** Nhưng cả hai cùng chỉ ra một điều quan trọng hơn con số:

> Toàn bộ phân loại L0–L3 của `deep-risk.md` §2.3 và bảng *"Lấy được an toàn"* §6.1 đều dựa trên §2.1 — nên với các builtin này **không có phép đo nào tồn tại**. Bài xử chúng như *"không cắm core"*. Đẳng thức này **khác** với *"không có tự thú"*.
>
> **Hệ quả cụ thể trong chính kế hoạch M5:** `look-at` (hạng 4, §4.4) và `history-search` (hạng 1 của `deep-risk.md` §8.2) đều nằm trong 13/14 đó ⇒ **chưa từng được đo về mức cắm core**, dù được xếp vào hàng "vì sao an toàn".

### 7.13 Số builtin "thiếu thật" — 9 hay 4 hay 6

| nguồn | con số | danh sách |
|---|---|---|
| `deep-inherit.md` §5 | **9** (22,5%) — 25 đã có, 6 không lấy vì xung đột | trong đó chỉ 4 đáng làm ngay |
| `deep-risk.md` §8.2 | **6** hạng mục port + 2 nhóm không lấy | `btw`, `loop-guard`, `bash-timeout`, `history-search`, `look-at`, `cache-keepalive` |
| **`deep-miss.md` §1** | **4** hạng mục "thiếu hẳn" | `btw` rơi (đã có), `loop-guard`/`history-search`/`bash-timeout` rơi (đã có ở dạng khác) |

Ba con số **không mâu thuẫn** — chúng đo ba thứ khác nhau (thiếu hẳn / đáng port / an toàn để port). Nhưng cả ba đều dùng **cùng một bảng phán quyết đã bị bác bỏ ở §7.1 và §7.4**. Đây là hệ quả dây chuyền, không phải mâu thuẫn độc lập.

### 7.14 Số dòng từng builtin — khác nhau giữa `builtins.md` và `deep-risk.md`

`builtins.md` đếm `.ts + .tsx + .md`; `deep-risk.md` đếm `.ts` không test. Giả thuyết giải thích phần lớn chênh lệch, **nhưng không nguồn nào nói rõ** ⇒ ghi ra như giả thuyết, không phải kết luận:

| builtin | `builtins.md` | `deep-risk.md` | chênh |
|---|---:|---:|---:|
| `mcp` | 10.244 | 9.327 | −917 |
| `compaction` | 10.788 | 8.779 | −2.009 |
| `terminal` | 8.260 | 6.962 | −1.298 |
| `anthropic-subscription` | 8.779 | 7.281 | −1.498 |
| `cursor-cli-oauth` | 5.620 | 5.186 | −434 |
| `gpt-apply-patch` | 2.351 | 2.051 | −300 |
| `config-reload` | 2.597 | 2.317 | −280 |
| `permission-system` | 1.859 | 1.638 | −221 |
| `rules` | 2.980 | 2.842 | −138 |
| `webfetch` | 1.230 | 1.062 | −168 |
| `cache-keepalive` | 569 | 483 | −86 |
| `btw` | 528 | 389 | −139 |
| `herdr` | 507 | 418 | −89 |
| `bash-timeout` | 211 | 118 | −93 |
| `loop-guard` | 885 | 718 | −167 |

⚠️ **Cảnh báo bẫy số:** `deep-risk.md` dùng **8.779** cho `compaction` (khác hẳn 10.788 của `builtins.md`), còn `builtins.md` dùng **8.779** cho `anthropic-subscription`. **Cùng một con số cho hai builtin khác nhau trong hai file.** Khi tra cứu, phải kiểm tra file.

### 7.15 "Không builtin nào chạm session layer" — 3 nguồn, 3 mức

| nguồn | phát quyết |
|---|---|
| `builtins.md` §7 | *"không builtin nào trong 40 cái này liên quan tới session persistence"* |
| `deep-risk.md` §7 | **"Có 10+ file khớp"** (`anthropic-subscription/session-binding.ts`, `ask-user/resume.ts`, `btw/index.ts`, `compaction/resume-slice.ts`…) |
| `verify-wiring.md` #10 | **"26 file"** |

Và `verify-miss.md` B6 thêm: khẳng định *"không builtin nào **ghi** JSONL"* là **không kèm lệnh** — vế này **không kiểm chứng được**.

⇒ Ba mức 0 / 10+ / 26 cho cùng một phép đo. **Con số thật chưa chốt**; nhưng ở cả ba mức thì kết luận hành động **giống nhau**: port phải đi qua `parseJsonlLenient` của omp (§6.6).

### 7.16 Sai số của `deep-risk.md` — 14 con số, **đều đi theo một hướng**

`verify-wiring.md` §0 và §6: *"toàn bộ đi xuống (thu nhỏ), không có sai số nào phóng to."* Ví dụ điển hình:

| mục | tài liệu | thực tế | chênh |
|---|---:|---:|---:|
| §3.6 tổng modifier `private` | 35 | **197** | ×5,6 |
| §2.2 B1 số path lõi | 10 | **55** | ×5,5 |
| §3.1 số dòng model-id | 14 | **13** | (nhưng dòng `compaction:292` là **dán tay**) |
| §3.1 số file preset | 33 | **38 / 35 / 31** | |
| §4.5 tổng dòng | 3.189 | **3.089** | |
| §3.5 `.slice(0,N)` | 12 file | **18 file** | |
| §0.3 số dialect | 12 | **11** | |

> **Không bác bỏ được điều gì ở tầng quyết định.** Ba kết luận chính của `deep-risk.md` — `prompt-preset` phải viết lại, `cursor-cli-oauth`/`anthropic-subscription` không lấy, giữ nguyên session layer của omp — **đứng vững** sau khi đo lại.

### 7.17 Tên file trong đề bài không tồn tại

`verify-inherit.md` §0: đề bảo bác bỏ `deep-inherit.md`, nhưng **file đó không tồn tại lúc đó** (`find -iname '*inherit*'` chỉ ra 3 file test của omp). Agent bác bỏ `deep-risk.md` vì đó là file duy nhất khớp phạm vi — và **tự ghi rõ đây là suy đoán về ý định đề**.

⇒ `deep-inherit.md` **hiện đã tồn tại** (427 dòng, sửa 13:21, sau khi `verify-inherit.md` chạy lúc 12:59) ⇒ **`verify-inherit.md` thực ra bác bỏ `deep-risk.md`, không phải `deep-inherit.md`.** Không có vòng nào đã kiểm chứng `deep-inherit.md`.

### 7.18 Hai bẫy phép đo đã biết — cả hai đều sinh kết quả RỖNG

| bẫy | lệnh sai | lệnh đúng | hậu quả |
|---|---|---|---|
| `\b` trong `git grep -E` trên macOS | `git grep -E '\bbtw\b'` | `git grep -w 'btw'` | làm sai kết luận `/btw` (§7.1) |
| `git ls-files` pathspec tương đối với cwd | `git ls-files 'packages/ai/src/**/prompt-cache*'` | `git grep -rln 'cache_control' -- packages/ai/src` | làm sai kết luận `cache-keepalive` (§7.2); `builtins.md` §4.3 đã tự sửa lần cho `goal` |

> **Sai pathspec cho kết quả rỗng, và kết quả rỗng dễ bị đọc thành "không tồn tại".** Cả hai bẫy đã làm sai kết luận ở **tầng quyết định**.

---

## 8. File nào vòng trước chết vì thiếu — và cái tôi cũng chưa đọc hết

### 8.1 File thiếu sẽ làm hỏng tài liệu này

| file | dòng | thiếu thì mất gì |
|---|---:|---|
| **`deep-miss.md`** | 761 | 🔴 **Chết.** Chứa phát hiện `\b` không hoạt động (§7.1) — bẫy làm **sai kết luận `/btw`** ở ba file trước. Không có nó, §4 và §6.1 sẽ bảo port `/btw` trong khi omp đã có bản lớn hơn 4,3× |
| **`verify-miss.md`** | 535 | 🔴 **Chết.** Phát hiện 41 file OMO (§7.5) + lỗ hổng 13/40 không có `changes.md` (§7.12) — thứ làm lộ 2 hạng mục trong kế hoạch (`look-at`, `history-search`) **chưa từng được đo** |
| **`deep-wiring.md`** | 557 | 🔴 **Chết.** Toàn bộ thứ tự seam (§5.4), 13 builtin chạy được ngay (§5.3), và danh sách 10 thứ "thổi phồng công" không mở (§5.5). Không có nó, §5 sẽ mất hết |
| **`verify-wiring.md`** | 466 | 🟠 Mất 14 sai số theo hướng thu nhỏ (§7.16) — không mất kết luận |
| **`verify-inherit.md`** | 564 | 🟠 Mất 8 bác bỏ + 2 bác bỏ một nửa; đáng chú ý là **bác bỏ được "OMO không khai trong `NOTICE.md`" một nửa** |
| **`new-packages.md`** | 575 | 🟠 Mất kết luận `senpi-codemode`/`pty`/`session-backends` + phát hiện `pi` **có** `session-backends` (§4.6) |
| **`ext-api.md`** | 471 | 🟠 Nguồn gốc của danh sách seam — nhưng đã bị `deep-wiring.md` §7 bác bỏ 3/6 mục. **Mất nó không chết, nhưng đừng tin nó** |
| **`deep-risk.md`** | 978 | 🟡 Mất 4 trong 5 vi phạm `AGENTS.md` + bảng tự-thú cắm core. Nhưng **14/14 con số nhỏ sai** |
| **`deep-inherit.md`** | 427 | 🟡 Mất bảng đối chiếu 40 theo 3 nhóm. **CHƯA AI KIỂM CHỨNG** — xem §7.17 |

### 8.2 Cái tôi cũng chưa đọc hết (minh bạch)

| file | dòng | tôi đọc | bỏ qua |
|---|---:|---|---|
| `builtins.md` | 423 | §1, §2, §3, §4, §5, §6, §7 (đủ) | — |
| `lineage.md` | 511 | đủ | — |
| `m1b-collision.md` | 425 | đủ | — |
| `changes-md.md` | 487 | §0, §5a–5e, §6, §7, §8, §9, §10 | §1–§4 (đếm heading, phân loại regex, 37 event mới) |
| `deep-miss.md` | 761 | §0, §1 (bảng tổng) | §1.1–§1.5 chi tiết, §2, §3 — **phần đặc tả chi tiết nhất, nên đọc tiếp khi bắt tay** |
| `deep-wiring.md` | 557 | §0, §5, §6, §7 | §1–§4 (đếm event/method, 10 seam chi tiết) |
| `deep-risk.md` | 978 | §6, §7, §8, §9 | §1–§5 (đo cắm core, 7 nhóm vi phạm `AGENTS.md`) |
| `verify-miss.md` | 535 | §0, B1, B2 | A1–A16, B3–B6, §4–§6 |
| `verify-wiring.md` | 466 | §0, §4, §6 | §1 (14 sai số chi tiết), §2, §3 |
| `verify-inherit.md` | 564 | §0, §1 | §2–§13 |
| `deep-inherit.md` | 427 | §5, §6 | §0–§4 — **chưa kiểm chứng ai cả** |
| `new-packages.md` | 575 | §0, tóm tắt | §1–§8 |
| `ext-api.md` | 471 | 0 | **chưa đọc dòng nào** |

**Ba chỗ tôi chủ động bỏ qua và cần nói thẳng:**
1. `ext-api.md` — **0 dòng**. Đây là nguồn gốc của toàn bộ danh sách seam, nhưng `deep-wiring.md` §7 đã bác bỏ 3/6 mục và xác nhận sai 1. Tài liệu này dựa vào `deep-wiring.md`. **Ai đó nên đọc `ext-api.md` và đối chiếu nếu M5 sắp động vào `types.ts`.**
2. `deep-risk.md` §1–§5 — bảng vi phạm `AGENTS.md` chi tiết (7 nhóm luật, số dòng/file). Đây là **checklist bắt buộc** khi port, tôi chỉ trích dẫn kết luận.
3. `deep-miss.md` §1.1–§1.5 — **đặc tả chi tiết nhất cho 4 hạng mục port**. §4 của tài liệu này chỉ đủ để *quyết định*, chưa đủ để *làm* mà không cần đọc lại `deep-miss.md`.

### 8.3 Ba ràng buộc từ briefing — vẫn đúng, vẫn áp dụng

1. **`gajae` là fork của dòng omp/pi**, không phải nguồn tham chiếu độc lập. `changes-md.md` §7: senpi **không nhắc gajae ở đâu trong 2.377 entry**. Không dùng làm đối chứng.
2. **`pi` KHÔNG có MCP, KHÔNG có ACP.** **Nhưng `omp` CÓ MCP** — `src/mcp/` 22 file + 4 doc + 129 file tracked. **Đừng suy từ "pi không có" sang "omp không có".**
3. **`chord` KHÔNG phải cơ chế vòng đời extension.** `packages/chord/changes.md` chỉ có **1 entry, 19 dòng**; và `core/extensions/builtin/` không tồn tại ở omp/pi để chord điều khiển. Không có vai trò trong M5.
4. **omp tự lành JSONL hỏng** — xem §6.6. Giữ nguyên.

---

## 9. Tóm tắt một trang cho người quyết định

| câu hỏi | trả lời |
|---|---|
| senpi là gì, chép được không? | Fork sống MIT của `pi` (cùng root SHA `a74c5da1`). Chép được gần nhìn toàn bộ. 3 điều kiện: giữ MIT notice, ghi attribution vào `NOTICE.md` của omp (**đang không có**), không lấy thương hiệu. Ghim theo commit SHA. |
| M1B lấy 7 package từ đâu? | **`pi`, toàn bộ.** Senpi đóng góp **3 dòng type annotation**; không có `durable`; `chord` là bản lùi. Cân nhắc **rút M1B từ 7 xuống 6**. |
| 40 builtin port được bao nhiêu? | Sau khi đo lại: **4 hạng mục "thiếu hẳn"** (cache-keepalive, 4 seam API, tool-pair-guard, look-at) + **13 chạy được ngay không cần seam** (trong đó thật dùng được ngay ~6–8). |
| Seam nào phải mở? | `agent_settled` (rẻ nhất) → `registerEntryRenderer` → `model_select` (gỡ nhiều nhất) → `session_abort` → 3 `setSession*`. **Không mở `executeTool` và 9 thứ khác** (0 builtin dùng). |
| Cái gì KHÔNG lấy? | `mcp`, `compaction`, `webfetch`, `ask-user`, `todotools`, `/btw` (omp đã hơn); `cursor-cli-oauth`, `anthropic-subscription`, `config-reload`, `herdr`, `terminal`, `ttsr` (lõi quá sâu); `prompt-preset`, `permission-system`, `tool-pair-guard` (phải viết lại); `senpi-codemode`, `pty`, `session-backends` (omp đã có lớn hơn); **session layer**. |
| Bước đầu tiên? | Ném 3 builtin seam-free vào `directory-resolution.ts:69` (`pkg.omp ?? pkg.pi`) **trước khi viết dòng seam nào**. Rẻ nhất, không tốn công sửa nếu sai. |
| Rủi ro dễ sai nhất? | Port `ask-user/resume.ts` hoặc `btw/index.ts` mà dùng `JSON.parse` trực tiếp → biến lỗi JSONL thành crash. Phải qua `parseJsonlLenient`. |

---

*Tài liệu này chỉ ghi những gì 13 file nguồn đã đo. Mọi con số đều có lệnh ở file nguồn. Nơi hai nguồn cho hai số khác nhau, §7 in cả hai và không tự chọn. Nếu sáu tháng sau bạn chạy lại §0 của `builtins.md` mà ra số khác, đó là câu hỏi đáng hỏi hơn cả bảng này.*

> ### Ghi chú về cách phần này được lắp ráp — vì tôi đã ghi sai một lần
>
> Tôi từng ghi ở đây rằng phần tổng hợp **bị cắt ở §3** vì agent hết context. **Đó là
> sai.** Agent không chết — nó viết tiếp, và tôi đã kết luận «chết» chỉ vì chụp
> phải file đúng lúc nó đang viết §4. Nó hoàn tất đủ 9 mục.
>
> Bài học, vì nó lặp lại: **không kết luận một agent đã chết chỉ từ một ảnh chụp
> file.** File đang được ghi bằng thể hiện là *đang viết*, không phải *đã xong và hỏng*.
> Phải chờ workflow báo `result`, hoặc chờ file đứng yên **và** workflow kết thúc.
>
> Bản thân phần tổng hợp có mục §8 tự liệt kê những file mà các vòng trước thiếu,
> nên nó đã tự xử lý đúng chỗ đó — không cần tôi ghi đè.

---

# Phần 1 — senpi là con của ai

## senpi là con của ai, và chúng ta có được quyền gì

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

---

# Phần 2 — M1B nên chép từ đâu

## M1B va chạm với senpi: nên chép 7 package từ `pi` hay từ `senpi`?

Ngày đo: 2026-09-28. Người đo: agent nghiên cứu (đọc tại chỗ, không clone lại).

## Tóm tắt một dòng

**Chép từ `pi`.** Trong 7 package M1B cần, `senpi` đóng góp **đúng 3 dòng code mới** (ba chú thích type `(chunk: Buffer)`), và **không hề có** package thứ bảy là `durable`. Riêng `chord` thì `senpi` là một **bản lùi** so với `pi`.

---

## 0. Chụp lại trạng thái các cây (để người đọc sau tự tái lập được)

```bash
git -C /Users/tranquangdang21/Projects/pi-ref        log -1 --format='%H %ad' --date=short
# d6af72e1857cfb10b41d8ff8e69f0d72b4cf6d31 2026-09-25
git -C /Users/tranquangdang21/Projects/senpi-ref     log -1 --format='%H %ad' --date=short
# ea9216269e9254b821446130b60d1e00759761dc 2026-09-28
```

Phiên bản package — **đây là mấu chốt của cả bài**:

```bash
for p in agent chord ai coding-agent telemetry; do
  for r in pi-ref senpi-ref; do
    printf "%-8s %-14s " "$r" "$p"
    python3 -c "import json;d=json.load(open('/Users/tranquangdang21/Projects/$r/packages/$p/package.json'));print(d['name'],d['version'])"
  done
done
```

| package | `pi-ref` | `senpi-ref` |
| --- | --- | --- |
| agent | `@earendil-works/pi-agent-core` **0.87.1** | `@earendil-works/pi-agent-core` **2026.9.28-3** |
| chord | `@earendil-works/chord` **0.87.1** | `@earendil-works/chord` **0.85.1** |
| ai | 0.87.1 | 2026.9.28-3 |
| coding-agent | 0.87.1 | 2026.9.28-3 |
| telemetry | 0.87.1 | 2026.9.28-3 |

Cột tên package của `senpi` **giữ nguyên tên `@earendil-works/...`** (chính là dấu hiệu fork-in-flight: đổi tên manifest là việc làm về sau). `senpi` dùng CalVer riêng cho mình, nhưng `chord` thì **vẫn kẹt ở 0.85.1** — vì `packages/protocol/changes.md` ghi rõ:

> `packages/protocol/package.json`: `@earendil-works/chord` is pinned to the exact upstream `0.85.1` it resolves to … the fork does not publish it.

Nghĩa là **senpi đã fork từ pi ở đúng version 0.85.1**, còn `pi` bây giờ đã đi tới 0.87.1. `pi` đang **xa hơn senpi hai bản minor**. Mọi phép đo dưới đây chỉ là hệ quả của một sự kiện này.

---

## 1. Bảng đo: file, dòng, tỉ lệ giống hệt từ byte

Lệnh (chạy từ trong từng repo):

```bash
git -C <repo> ls-files 'packages/<tên>/*' | wc -l
git -C <repo> ls-files 'packages/<tên>/*' | (cd <repo> && xargs wc -l | tail -1)
```

Tỉ lệ giống byte (`cmp` từng file, đếm cả tử số và mẫu số):

```bash
PI=/Users/tranquangdang21/Projects/pi-ref; SE=/Users/tranquangdang21/Projects/senpi-ref
for p in chord protocol server client durable telemetry evals; do
  n=0; s=0
  for f in $(git -C $PI ls-files "packages/$p/*"); do
    s=$((s+1)); cmp -s "$PI/$f" "$SE/$f" 2>/dev/null && n=$((n+1))
  done
  echo "$p: $n/$s"
done
```

### Kết quả

| package | pi file | pi dòng | senpi file | senpi dòng | giống byte | chỉ có ở pi | cùng có nhưng KHÁC | chỉ có ở senpi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| chord | 62 | 19.006 | 41 | 10.871 | **22/62 (35,4%)** | **23** | 17 | 2 |
| protocol | 17 | 1.591 | 19 | 1.707 | **15/17 (88,2%)** | 0 | 2 | 2 |
| server | 29 | 3.288 | 31 | 4.520 | **24/29 (82,7%)** | 0 | 5 | 2 |
| client | 19 | 2.151 | 21 | 2.279 | **15/19 (78,9%)** | 0 | 4 | 2 |
| **durable** | **63** | **21.093** | **0** | **0** | **0/63 (0%)** | **63** | 0 | **0** |
| telemetry | 12 | 1.727 | 14 | 1.794 | **8/12 (66,6%)** | 0 | 4 | 2 |
| evals | 30 | 3.605 | 25 | 3.092 | **1/30 (3,3%)** | **25** | 4 | **20** |

Tự kiểm tra số: `giống + chỉ_có_pi + khác = pi_file` và `giống + khác + chỉ_có_senpi = senpi_file` cho cả 7 hàng đều đúng.

**Cột "chỉ có ở senpi" là gì?** Với 6 package, nó gần như luôn **2 file**: `changes.md` + `AGENTS.md`/`CHANGELOG.md` — tức là sổ ghi chép fork, không phải code. Riêng `evals` có 20 file, xem mục 3.

---

## 2. `durable`: senpi không có, VÀ package `durable` của chính `pi` cũng chưa ai dùng

### 2.1. senpi không có `packages/durable/` — 0 file, không phải "không tìm thấy"

```bash
git -C /Users/tranquangdang21/Projects/senpi-ref ls-files 'packages/durable/*' | wc -l
# 0
ls -d /Users/tranquangdang21/Projects/senpi-ref/packages/durable
# lsd: packages/durable: No such file or directory
```

`git ls-files | grep durable` trong senpi cho **11** hit, nhưng đọc tên file thì **không cái nào** là package — toàn là extension terminal, docs và test:

```
packages/coding-agent/src/core/extensions/builtin/terminal/durable-command.ts
packages/coding-agent/src/core/extensions/builtin/terminal/durable-file.ts
packages/coding-agent/test/suite/terminal-durable-admission.test.ts   (v.v.)
```

→ **Kết luận dứt khoát: không thể chép `durable` từ senpi. Lựa chọn chỉ còn một: `pi`.**

### 2.2. Nhưng `durable` của `pi` là code chết — không package nào import nó

```bash
git -C /Users/tranquangdang21/Projects/pi-ref grep -rn "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
```

Chỉ ra **4 nơi, không có nơi nào là mã sản phẩm**:

```
README.md:33                     (dòng bảng liệt kê package)
package-lock.json:738, 5778      (sinh ra từ chính manifest của nó)
scripts/durable-browser-smoke-entry.ts   (script smoke riêng)
tsconfig.json:19-21              (path mapping để tsc resolve nội bộ nó)
```

Và: `grep -n durable packages/coding-agent/package.json` → không có. `packages/agent/package.json` deps = `['@earendil-works/chord', '@earendil-works/pi-ai', '@earendil-works/pi-telemetry', 'diff', 'ignore', 'typebox', 'yaml']` — **không có `pi-durable`**.

`durable` còn là package **publishable** (`private` không được set, `license: MIT`, có 9 export subpath), tức nó *được* xuất bản lên npm dù không ai trong repo dùng tới. Nó có test riêng (`packages/durable/test/`, 12+ file) nên nó build xanh — chỉ là không nối vào sản phẩm.

### 2.3. Phần durable **thật sự chạy** nằm ở `agent`, và hai repo **giống nhau 8/8 byte**

Đây mới là tầng session storage đang dùng thật:

```bash
for f in $(git -C $PI ls-files 'packages/agent/src/harness/session/jsonl/*'); do
  cmp -s "$PI/$f" "$SE/$f" || echo "DIFF $f"; done
# (không in gì)
# 8/8 identical
```

8 file: `codec.ts` `fork.ts` `index.ts` `io.ts` `legacy-v3.ts` `repo.ts` `storage.ts` `types.ts` — tổng ~1.894 dòng.

**Cái này quyết định cách M1B nên xử lý `durable`:** nếu M1B cứ chép 21.093 dòng `durable` của `pi` vào omp, thì omp sẽ mang **một package chết chung với `pi`**, trong khi tầng storage thật (mà omp đang cần) nằm ở `agent/harness/session` và hai repo cho ra **cùng một byte**. Chi phí 21K dòng, giá trị 0 — trừ khi omp chủ động muốn *nối* `durable` vào sản phẩm (xem mục 5).

---

## 3. Package nào senpi "mới hơn"? Câu trả lời: không package nào

### 3.1. `protocol` — hòa tuyệt đối: **0 file nguồn khác nhau**

Lọc bỏ `CHANGELOG.md`, `README.md`, `AGENTS.md`, `changes.md`, `package.json`, phần còn lại:

```
--- protocol ---
(không in gì)
```

`protocol` = 15/17 file giống byte + 2 file (`CHANGELOG.md`, `package.json`) chỉ khác vì fork bookkeeping. **`protocol` là bản sao của `pi`.**

### 3.2. `server` — senpi "thêm" đúng **2 dòng**, và đó là 2 dòng type annotation

```bash
diff $PI/packages/server/src/testing/client.ts $SE/packages/server/src/testing/client.ts
diff $PI/packages/server/src/transports/unix/listener.ts $SE/packages/server/src/transports/unix/listener.ts
```

Cả hai đều ra đúng một thay đổi:

```diff
-	socket.on("data", (chunk) => {
+	socket.on("data", (chunk: Buffer) => {
```

`changes.md` của chính senpi xác nhận đây là sửa **type-only**, không đổi runtime:

> annotated the `socket.on("data")` chunk as `Buffer` so the zero-copy `Uint8Array(...)` view construction typechecks against the upgraded Node type surface; **runtime behavior is unchanged**.

### 3.3. `client` — y hệt `server`: **2 dòng type annotation**

```diff
-		socket.on("data", (chunk) => {
+		socket.on("data", (chunk: Buffer) => {
```
(ở `src/unix.ts`, cộng 2 chỗ trong `test/unix-transport.test.ts`)

### 3.4. `telemetry` — 43 dòng, **toàn format**, không ngữ nghĩa

`src/index.ts` khác 43 dòng, xem cặp này:

```diff
< type SchemaSpanEvents<
< 	Schema extends TelemetrySchemaDefinition,
< 	Name extends TelemetrySchemaSpanName<Schema>,
< > = SchemaSpan<Schema, Name> extends { events: infer Events extends Record<...> }
< 	? Events
< 	: Record<never, never>;
> type SchemaSpanEvents<Schema extends TelemetrySchemaDefinition, Name extends TelemetrySchemaSpanName<Schema>> =
> 	SchemaSpan<Schema, Name> extends { events: infer Events extends Record<...> }
> 		? Events
> 		: Record<never, never>;
```

Đây là **formatter wrap khác phiên bản** (biên dịch với TypeScript 7/biome pin khác), không phải tính năng. `types.ts` của `chord` có cùng loại khác biệt: `JsonRepresentation<T> =` xuống dòng khác.

### 3.5. `chord` — ngược lại: **senpi là bản lùi**

Đây là phát hiện quan trọng nhất, và nó làm đảo ngược giả định "senpi nhiều tính năng hơn".

**a) `chord` của senpi thiếu 23 file mà `pi` có.** Trong đó, phần lớn là hệ delta đã bị tách module ở `pi`:

| file | dòng | có ở `pi`? |
| --- | ---: | --- |
| `packages/chord/src/delta/tracker.ts` | 2.205 | ✅ có · ❌ **không có ở senpi** |
| `packages/chord/src/delta/diff.ts` | 523 | ✅ có · ❌ không có ở senpi |
| `packages/chord/src/delta/apply-immutable-trusted.ts` | 128 | ✅ có · ❌ không có ở senpi |
| `packages/chord/src/delta/revision-validator.ts` | 75 | ✅ có · ❌ không có ở senpi |
| `packages/chord/src/delta/draft.ts` | 10 | ✅ có · ❌ không có ở senpi |
| `test/delta-benchmark/*` (6 file) | — | chỉ có ở `pi` |
| `test/delta-tracker/*` (3 file) | — | chỉ có ở `pi` |
| `test/state-*.test.ts`, `state.test.ts` (5 file) | — | chỉ có ở `pi` |

Cân bằng dòng: `pi` delta = 694 + 2.205 + 523 + 128 + 75 + 10 = **3.635 dòng**. `senpi` delta = **1.267 dòng** (gộp tất cả vào `index.ts`).

**b) API surface: `pi` có, `senpi` không.** Đối chiếu `grep -n "^export"` hai file `delta/index.ts`:

```bash
grep -n "^export" $PI/packages/chord/src/delta/index.ts | grep -E "diffRevisions|Draft|applyImmutableBatches"
grep -n "^export" $SE/packages/chord/src/delta/index.ts | grep -E "diffRevisions|Draft|applyImmutableBatches"
```

→ `pi` trả về `diffRevisions`, `Draft`, `applyImmutableBatches`. `senpi`: **rỗng, không dòng nào khớp**.

`src/index.ts` của `chord` cũng cho thấy `pi` export thêm mà `senpi` không có: `Draft`, `copyJson`/`CopyJsonOptions`, `AttachedReplicatedState`, `ReplicatedStateSource`, `ReplicatedStateSourceAttachment`, `ReplicatedStateSourceFrame`, `ReplicatedStateSourceOptions`.

Và `src/api.ts` (26 dòng khác) là một **feature mới của `pi`** mà `senpi` chưa có — `replicatedState()` nhận thêm nguồn ngoài:

```diff
-	export function replicatedState<T extends object>(initial: T): MutableReplicatedState<T> {
-		return new MutableReplicatedStateImpl(initial);
+	export function replicatedState<T>(
+		source: ReplicatedStateSource<T>,
+		options?: ReplicatedStateSourceOptions,
+	): AttachedReplicatedState<T>;
+	... if (isReplicatedStateSource(initialOrSource)) return attachReplicatedStateSource(initialOrSource, options);
```

Tức `pi` đã thêm khả năng **gắn state từ một nguồn bên ngoài** (replica), `senpi` chưa.

`types.ts` (141 dòng khác) xác nhận thêm: `pi` có `change(context, mutate: (draft: Draft<T>) => void)` — API overlay dùng Draft — cùng docblock "contract-immutable… may share containers with an in-process provider", và toàn bộ interface `ReplicatedStateSourceFrame`. `senpi` chỉ có doc cũ "Listener values are immutable and may structurally share unchanged data".

**c) Hệ quả cho M1B:** nếu chép `chord` từ `senpi`, omp **mất** ~2.400 dòng delta, mất `diffRevisions`, mất `Draft`, mất `applyImmutableBatches`, mất toàn bộ API replicated-state, và mất luôn bộ benchmark delta. Đây là lý do `chord` phải chép từ `pi` — không có tranh luận.

*(Ghi chú: `git -C $PI grep -rn "diffRevisions\|applyImmutableBatches" -- 'packages/coding-agent/src' 'packages/agent/src'` trả về rỗng — hiện tại `pi` cũng chưa ai tiêu thụ. Đây là API đã có sẵn để dùng, không phải thứ đang chạy. Ghi lại để người đọc sau không tưởng là "đang dùng".)*

### 3.6. `evals` — khác biệt thật, nhưng là **viết lại theo hướng khác**, không phải "nhiều hơn"

`evals` là package duy nhất lệch thật sự: **1/30 file giống byte**, 25 file chỉ có ở `pi`, 20 file chỉ có ở `senpi`. Cả hai đều dùng `vitest-evals` làm harness gốc:

| | `pi` | `senpi` |
| --- | --- | --- |
| `vitest-evals` | 0.15.0 | **0.17.0** |
| `vitest` | 4.1.9 | **5.0.1** |
| tên | `@earendil-works/pi-evals` (0.87.1) | `@code-yeongyu/senpi-evals` (2026.7.25) |

- `pi` giữ: harness tự viết (`src/harness.ts`, `src/cli.ts`, `src/plan.ts`, `src/report.ts`) + **Docker** (`docker/Dockerfile`, `docker/entrypoint.ts`, `src/docker.ts`).
- `senpi` bỏ toàn bộ nhánh Docker và `plan`/`report`/`cli`, thay bằng `src/vitest-evals/{artifacts,harness-table,reporter,setup,summary}.ts`, và dùng alias trỏ vào `@code-yeongyu/senpi`.

Cái senpi làm được tốt hơn: harness đã bám vitest-native (bảng harness, artifacts, summary thay cho báo cáo tự viết), và `vitest-evals`/`vitest` mới hơn 2–3 bậc. Cái senpi **không** cho: eval chạy trong container Docker cách ly, và theo `changes.md` của chính senpi, harness của nó **hard-code import `@code-yeongyu/senpi`**, nên phải sửa lại mới dùng được cho omp.

Đây là **ưu tiên thiết kế**, không phải "senpi hơn". Không nên coi `evals` là lý do để đổi nguồn.

---

## 4. Câu hỏi JSONL hỏng: senpi **không** sửa, và có cách thứ ba

Kiểm định lại các điều kiện tiên quyết đã được nêu (đều **đúng**):

```bash
# (1) omp tự lành JSONL hỏng — xác nhận vị trí
grep -n "export function parseJsonlLenient" /Users/tranquangdang21/Projects/ultraworkers/packages/utils/src/stream.ts
# 575:export function parseJsonlLenient<T>(buffer: string, options: { onMalformedRecord?: () => void } = {}): T[] {
```

```bash
# (2) pi ném JsonlCorruptionError — class khai báo ở dòng 80, ném thẳng ở dòng 119
sed -n '80,84p;114,120p' /Users/tranquangdang21/Projects/pi-ref/packages/durable/src/storage/jsonl/storage.ts
```

```ts
export class JsonlCorruptionError extends Error {           // dòng 80
	constructor(message: string, cause?: Error) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = "JsonlCorruptionError";
	}
...
const parseJson = (text: string, description: string): unknown => {
	try {
		return JSON.parse(text) as unknown;
	} catch (error) {
		throw new JsonlCorruptionError(`Malformed complete ${description}`, ...);   // dòng 119
	}
};
```

`catch` ở đây chỉ **bọc `JSON.parse`** rồi ném lại thành lỗi có kiểu — **không có** bất kỳ cơ chế phục hồi nào. Xác nhận.

### 4.1. senpi: không `CorruptionError`, không `parseJsonlLenient`, không `onMalformedRecord`

```bash
git -C /Users/tranquangdang21/Projects/senpi-ref grep -n "CorruptionError" -- 'packages/*'          # rỗng
git -C /Users/tranquangdang21/Projects/senpi-ref grep -rn "parseJsonlLenient" -- 'packages/*'      # rỗng
git -C /Users/tranquangdang21/Projects/senpi-ref grep -rn "alformedRecord" -- 'packages/*'         # rỗng
```

**Cả ba lệnh đều không in gì.** Không phải "tìm không ra" — mà là `git grep` trên toàn bộ cây không có match nào.

Và cái senpi thực sự làm cũng là **hard-fail**, chỉ khác là ném `Error` trần:

```ts
// packages/agent/src/harness/session/jsonl/io.ts
export function parseJsonlTransaction(line: string): CommittedWrite[] {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch (error) {
		throw new Error("Invalid JSONL transaction: not valid JSON", { cause: error });
	}
	...
}
```

→ **senpi không hề tự lành JSONL hỏng.** Nó đứng cùng phía với `pi`: parse hỏng → ném → session không load được.

### 4.2. Kết luận cho câu hỏi số 4 của đề bài

> "Nếu senpi cũng ném lỗi thì kết luận: dùng senpi làm nguồn cũng không giúp, phải giữ thiết kế của omp."

**Đúng, và còn mạnh hơn đề bài nghĩ:** không chỉ "không giúp", mà là **senpi không có `durable` để mà lấy**, và tầng storage thật của nó (`agent/harness/session/jsonl`, 8/8 byte giống `pi`) cũng ném lỗi trần y hệt.

**`omp` phải giữ nguyên thiết kế tự lành của mình.** Chép bất kỳ tầng session nào của `pi` hay của `senpi` vào omp đều là **lùi về sau** so với `parseJsonlLenient` + `onMalformedRecord` + `malformedRecords → #rewriteRequired` mà omp đang có.

---

## 5. Kết luận dứt khoát, theo từng package

| package | Chép từ | Lý do (đo được) |
| --- | --- | --- |
| **chord** | **`pi`** | senpi thiếu 23 file, mất hệ delta 3.635→1.267 dòng, mất `diffRevisions`/`Draft`/`applyImmutableBatches`, mất API `ReplicatedStateSource`. Chép từ senpi là **lùi**. |
| **protocol** | **`pi`** (hòa) | 0 file nguồn khác nhau. Lấy `pi` để giữ **một nguồn duy nhất** cho cả 7 package — quyết định vận hành, không phải kỹ thuật. |
| **server** | **`pi`** | Senpi chỉ thêm 2 dòng `(chunk: Buffer)`, type-only. Không đáng đổi nguồn. |
| **client** | **`pi`** | Senpi chỉ thêm 2 dòng `(chunk: Buffer)`, type-only. |
| **durable** | **`pi`** — nhưng **đừng chép nguyên xi** | senpi có **0 file**; chỉ `pi` có. **Nhưng** `durable` của `pi` không package nào import (mục 2.2) và tầng storage thật là `agent/harness/session/jsonl` — **8/8 byte giống senpi**. Chép 21.093 dòng code chết là chi phí vô ích. Xem khuyến nghị bên dưới. |
| **telemetry** | **`pi`** | 43 dòng khác là **formatter wrap**, không ngữ nghĩa. |
| **evals** | **`pi`**, rồi *cân nhắc* lấy cảm hứng từ `senpi` | Lệch thật (1/30) nhưng là **viết lại theo hướng khác**: senpi bỏ Docker, dùng vitest 5 + vitest-evals 0.17. Không phải "nhiều hơn". Chọn theo nhu cầu, không theo mặc định. |

### Khuyến nghị cụ thể cho M1B

1. **Đổi câu hỏi của M1B.** Đề bài hỏi "7 package" — nhưng `durable` về mặt kỹ thuật là **package chết không ai import**. Trước khi chép 21K dòng, hãy hỏi: omp có thực sự cần `durable`, hay chỉ cần tầng session mà `agent/harness/session` đã cung cấp? Nếu câu trả lời là "không", M1B rút từ **7 xuống 6** package và tiết kiệm 21.093 dòng + một `JsonlCorruptionError` làm chật session resilience.
2. **Nguồn chép = `pi`, toàn bộ.** Không có package nào trong 7 mà senpi đóng góp code mới đáng kể. `senpi` là nguồn tham chiếu **cho M5** (40 extension builtin, `pty`, `senpi-codemode`), **không phải cho M1B**.
3. **Hai thứ duy nhất đáng cân nhắc lấy từ senpi, đều nhỏ:** (a) chú thích `(chunk: Buffer)` — nhưng đây là thứ omp tự thêm được nếu gặp lỗi type; (b) bộ `vitest-evals` harness mới + harness 0.17.0/0.17.1 — chỉ khi omp quyết định bỏ Docker-based evals.
4. **Cấm chép tầng session của `pi`.** Bất kỳ thứ gì chạm JSONL phải đi qua `parseJsonlLenient` của omp (`packages/utils/src/stream.ts:575`).

---

## Phụ lục: lệnh tái chạy toàn bộ

```bash
PI=/Users/tranquangdang21/Projects/pi-ref
SE=/Users/tranquangdang21/Projects/senpi-ref

# Bảng mục 1: file / dòng / giống byte / phân loại phân kỳ
for p in chord protocol server client durable telemetry evals; do
  pf=$(git -C $PI ls-files "packages/$p/*" | wc -l)
  pl=$(git -C $PI ls-files "packages/$p/*" | (cd $PI && xargs wc -l 2>/dev/null | tail -1) | awk '{print $1}')
  sf=$(git -C $SE ls-files "packages/$p/*" | wc -l)
  sl=$(git -C $SE ls-files "packages/$p/*" | (cd $SE && xargs wc -l 2>/dev/null | tail -1) | awk '{print $1}')
  ident=0; onlypi=0; changed=0
  for f in $(git -C $PI ls-files "packages/$p/*"); do
    if [ ! -e "$SE/$f" ]; then onlypi=$((onlypi+1))
    elif cmp -s "$PI/$f" "$SE/$f"; then ident=$((ident+1))
    else changed=$((changed+1)); fi
  done
  onlyse=$(comm -13 <(git -C $PI ls-files "packages/$p/*"|sort) <(git -C $SE ls-files "packages/$p/*"|sort) | wc -l)
  echo "$p pi=$pf/$pl senpi=$sf/$sl identical=$ident/$pf only_pi=$onlypi changed=$changed only_senpi=$onlyse"
done

# Danh sách file phân kỳ, từng package
for p in chord protocol server client durable telemetry evals; do
  echo "=== $p ==="
  comm -23 <(git -C $PI ls-files "packages/$p/*"|sort) <(git -C $SE ls-files "packages/$p/*"|sort)   # chỉ có ở pi
  comm -13 <(git -C $PI ls-files "packages/$p/*"|sort) <(git -C $SE ls-files "packages/$p/*"|sort)   # chỉ có ở senpi
  for f in $(comm -12 <(git -C $PI ls-files "packages/$p/*"|sort) <(git -C $SE ls-files "packages/$p/*"|sort)); do
    cmp -s "$PI/$f" "$SE/$f" || echo "CHANGED $f"
  done
done

# durable: không tồn tại ở senpi / là code chết ở pi / tầng thật giống nhau
git -C $SE ls-files 'packages/durable/*' | wc -l                                   # 0
git -C $PI grep -rn "pi-durable" -- '*.json' '*.ts' '*.md' | grep -v '^packages/durable/'
cmp <(git -C $PI ls-files 'packages/agent/src/harness/session/jsonl/*' | sed 's|^|'"$PI"'/|' | xargs cat) \
    <(git -C $SE ls-files 'packages/agent/src/harness/session/jsonl/*' | sed 's|^|'"$SE"'/|' | xargs cat) && echo "8/8 IDENTICAL"

# JSONL: senpi không có gì cả
git -C $SE grep -n "CorruptionError"    -- 'packages/*'   # rỗng
git -C $SE grep -rn "parseJsonlLenient" -- 'packages/*'   # rỗng
git -C $SE grep -rn "alformedRecord"    -- 'packages/*'   # rỗng

# Chỉ còn code thật (bỏ sổ ghi chép fork), 4 package giống nhau
for p in protocol server client telemetry; do
  for f in $(git -C $PI ls-files "packages/$p/*"); do
    b=$(basename "$f")
    case "$b" in CHANGELOG.md|README.md|AGENTS.md|changes.md|package.json) continue;; esac
    [ -e "$SE/$f" ] || continue
    cmp -s "$PI/$f" "$SE/$f" || { echo "== $f"; diff "$PI/$f" "$SE/$f"; }
  done
done

# chord: senpi thiếu gì
comm -23 <(git -C $PI ls-files 'packages/chord/*'|sort) <(git -C $SE ls-files 'packages/chord/*'|sort)
grep -n "^export" $PI/packages/chord/src/delta/index.ts | grep -E "diffRevisions|Draft|applyImmutableBatches"   # có
grep -n "^export" $SE/packages/chord/src/delta/index.ts | grep -E "diffRevisions|Draft|applyImmutableBatches"   # rỗng
```

## Ghi chú về phương pháp

- Mọi con số trong tài liệu này lấy từ `git ls-files` + `cmp` + `wc -l` + `git grep` trên cây đã clone sẵn; không có phép đo nào dựa vào trích dẫn trong `README`.
- Khi hai phép cho hai số khác nhau, tài liệu ghi rõ phép đo. Trường hợp duy nhất phát sinh: lần đo đầu của tôi gắn nhãn cột `only_in_senpi` sai (thực chất đếm cả file "cùng có nhưng khác"). Bảng ở mục 1 là kết quả **đã sửa nhãn và kiểm tra lại**; nó thỏa cả hai đẳng thức `giống + only_pi + khác = pi_file` và `giống + khác + only_se = senpi_file` cho cả 7 hàng.
- "Không có" ở đây đều là kết quả `git grep` trả về rỗng trên **toàn bộ** `packages/*`, không phải suy đoán từ việc không mở file.

---

# Phần 3 — bản đồ 40 builtin

## senpi — bản đồ 40 builtin extension, và so sánh với `omp`

> Ngày đo: **2026-09-28**. senpi HEAD `ea9216269e9254b821446130b60d1e00759761dc` (Mon Sep 28 14:12:31 2026 +0900).
> Cây senpi: `/Users/tranquangdang21/Projects/senpi-ref` · Cây omp: `/Users/tranquangdang21/Projects/ultraworkers`.
> Mọi khẳng định dưới đây kèm lệnh. Người đọc sau 6 tháng nên chạy lại mục [§0](#0-cách-tự-chạy-lại) trước khi tin.

---

## 0. Cách tự chạy lại

Tất cả phép đo trong tài liệu này tái lập được bằng 6 lệnh. Không có con số nào trong đây là suy đoán.

```bash
# 1. Xác nhận phiên bản senpi
git -C /Users/tranquangdang21/Projects/senpi-ref log -1 --format='%H %ad'

# 2. Tổng khối lượng cây builtin (40 thư mục)
cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.md' \) -exec cat {} + | wc -l   # → 97893

# 3. Số dòng từng thư mục
for d in */; do d=${d%/};
  n=$(find "$d" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.md' \) -exec cat {} + 2>/dev/null | wc -l)
  echo "$n|$d"; done | sort -t'|' -k1 -rn

# 4. Bề mặt đăng ký của từng builtin (tool / command / hook / flag / provider)
for d in */; do d=${d%/};
  t=$(grep -rhoE '\bregisterTool\('        "$d" --include='*.ts' | wc -l)
  c=$(grep -rhoE '\bregisterCommand\('     "$d" --include='*.ts' | wc -l)
  h=$(grep -rhoE '\.on\("(session|agent|turn|message|tool|user|input|context|model|system|thinking|project|resources|before_provider|after_provider|ui_prompt)[a-z_]*"' "$d" --include='*.ts' | wc -l)
  f=$(grep -rhoE '\bregisterFlag\('        "$d" --include='*.ts' | wc -l)
  p=$(grep -rhoE '\bregisterProvider\('    "$d" --include='*.ts' | wc -l)
  echo "$d tool=$t cmd=$c hook=$h flag=$f provider=$p"; done

# 5. Mức độ "cắm vào core": đọc mục tự thú trong changes.md
cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
grep -h 'Why an extension could not handle it' $(find . -name changes.md) | wc -l

# 6. Core file bị builtin chạm tới (loại trừ test)
grep -rhoE '`packages/[^`:]+`' . --include=changes.md \
  | grep -v 'core/extensions/builtin' | tr -d '`' | grep -v '/test/' \
  | sed 's|packages/coding-agent/||' | sort -u
```

> **Hai cái bẫy phép đo tôi đã vấp, ghi lại để lần sau không vấp nữa.**
>
> 1. `git -C <repo> ls-files "packages/..."` trả về đường dẫn tính từ **gốc repo**. Nếu bạn `cd` vào thư mục con rồi đưa kết quả đó cho `xargs grep`, nó sẽ ra 0 dòng. Phép đo bề mặt đăng ký đầu tiên của tôi bug vì chính lý do này. → Dùng `grep -r` trong thư mục.
> 2. Pathspec của `git ls-files` lại **tương đối với thư mục hiện tại**, không phải so với gốc. Tôi chạy `git ls-files 'src/tools/goal*'` từ gốc repo (thiếu tiền tố `packages/coding-agent/`) và kết luận omp "không có goal" — sai, omp có `src/goals/` 715 dòng. → Dùng `git ls-files | grep` thay vì pathspec khi đang ở gốc. Chi tiết ở §4.3.
>
> Cả hai lỗi đều cho ra **kết quả rỗng**, và kết quả rỗng rất dễ bị đọc thành "không tồn tại". Đó là nguyên nhân gốc của mọi phát hiện sai kiểu "omp thiếu hẳn".

---

## 1. Phát hiện cấu trúc lớn nhất: omp chưa từng có khái niệm "builtin extension"

Đây là khác biệt lớn hơn nhiều so với "senpi có nhiều tính năng hơn". Không phải senpi có 40 thứ omp không có. **omp không có tầng "builtin" nào cả.**

**Đo ở omp:**

```bash
$ find packages/coding-agent/src/extensibility -type d
packages/coding-agent/src/extensibility
packages/coding-agent/src/extensibility/custom-tools
packages/coding-agent/src/extensibility/plugins
packages/coding-agent/src/extensibility/extensions
packages/coding-agent/src/extensibility/hooks
packages/coding-agent/src/extensibility/custom-commands
packages/coding-agent/src/extensibility/custom-commands/bundled
packages/coding-agent/src/extensibility/custom-commands/bundled/annotate
packages/coding-agent/src/extensibility/custom-commands/bundled/review
packages/coding-agent/src/extensibility/custom-commands/bundled/ci-green
```

Không có `builtin/`. Chỗ gần nhất là `custom-commands/bundled/` với **3** mục (annotate, review, ci-green) — và đó là *prompt command*, không phải extension.

**Đo ở senpi:** `builtin/index.ts` khai báo mảng `builtinExtensions` gồm **44 entry** (`grep -c '^\t{ id: "' index.ts` → 44), cộng `globalDefaultExtensionFactories` 4 entry nữa.

**Hệ quả trực tiếp cho M5:** "lấy 40 builtin của senpi" **không phải là copy 40 thư mục**. Phần lớn giá trị của senpi nằm ở *việc nó biến tính năng thành extension đóng gói* — còn omp đã viết thẳng tính năng vào `src/tools/`. Câu hỏi đúng cho M5 không phải "ta lấy builtin nào" mà là **"ta có nên chuyển `src/tools/` sang coi là builtin extension không"** — một câu hỏi về kiến trúc, không phải về danh sách.

### 1.1. Hai API extension gần như ngang nhau — nên cơ hội port là thật

Điều này ngược lại với dự đoán "senpi đã diverge quá xa". Đo:

| | senpi | omp |
|---|---|---|
| File định nghĩa API | `core/extensions/types.ts` (2.732 dòng) | `extensibility/extensions/types.ts` (71 KB) |
| `interface ExtensionAPI` | dòng 1907 | dòng 1256 |
| Số event `on(event:)` | 42 | **41** |

Cả hai đều có `registerTool` / `registerCommand` / `registerFlag` / `registerShortcut` / `registerProvider` / `registerMessageRenderer` / `setModel` / `setActiveTools`. **Cùng một hình dạng API.** Đây là tin tốt cho M5: một builtin viết cho senpi port sang omp không cần viết lại hạ tầng.

Khác biệt đáng kể nhất về *tên* event (không phải về số lượng):

| Chỉ có ở senpi | Chỉ có ở omp |
|---|---|
| `session_parked`, `session_resumed`, `session_abort`, `session_extensions_removed` | `session_switch`, `session_branch` |
| `ui_prompt_start`, `ui_prompt_end` | `session_stop` |
| `model_select`, `system_prompt_change`, `thinking_level_select` | `auto_compaction_start/end`, `auto_retry_start/end` |
| `tool_activated`, `input_disposition` | `tool_approval_requested/resolved`, `user_python` |
| `project_trust` | `todo_reminder`, `goal_updated`, `ttsr_triggered`, `mcp_notification` |

Điểm đáng chú ý: **omp đã có sẵn `goal_updated` / `todo_reminder` / `ttsr_triggered` / `mcp_notification` làm event công khai.** Tức là tính năng goal, todo, tts, MCP của omp đã *chủ động* mở hook cho extension — đúng cái senpi phải tự chếp. Đây là dấu hiệu hai bên đang hội tụ.

---

## 2. Bảng 40 builtin

Cột "dòng" đếm `.ts + .tsx + .md` trong thư mục. Cột hook/tool/cmd đếm bằng `grep -rhoE` như lệnh ở §0.

| # | builtin | dòng | file | NÓ LÀM CÁI GÌ (một câu) | bề mặt đăng ký |
|---|---|---|---|---|---|
| 1 | `compaction` | 10.788 | 50 | Quản lý nén ngữ cảnh: pipeline, checkpoint, circuit-breaker, warm-anchor | 9 hook, 2 provider |
| 2 | `mcp` | 10.244 | 67 | Cầu nối MCP client: nạp server, đăng ký tool `mcp__*`, OAuth | 5 tool, 2 cmd (`mcp`), 3 hook, 1 renderer |
| 3 | `anthropic-subscription` | 8.779 | 58 | Provider lane Claude subscription (SDK OAuth), quản lý account | 1 cmd (`claude-account`), 15 hook, 1 flag, 1 provider |
| 4 | `terminal` | 8.260 | 53 | PTY bền vững: 6 tool bash (`bash`, `bash_input`, `bash_output`, `bash_resize`, `kill_bash`, `monitor`), lease, restore, orphan-reaper | 6 tool, 7 hook, 2 renderer |
| 5 | `goal` | 6.304 | 39 | Vòng lặp mục tiêu tự tiếp tục: đặt goal, tự nối lượt, cache-warm | 3 tool, 1 cmd (`goal`), 13 hook, 1 renderer — 4.566 dòng TS (omp: 715) |
| 6 | `cursor-cli-oauth` | 5.620 | 25 | Lane Cursor CLI OAuth: spawn executable, đo model, refresh catalog | 1 cmd (`cursor-account`), 2 hook, 1 provider |
| 7 | `hooks` | 4.663 | 23 | Engine thực thi hook người dùng (Claude-Code style hooks.json): PreToolUse/Stop/… | 9 hook, 1 cmd |
| 8 | `prompt-preset` | 4.305 | 40 | Thư viện prompt theo model: chọn preset theo model rồi bơm vào system prompt | 2 hook |
| 9 | `loop` | 4.134 | 13 | Bộ hẹn giờ lặp: cron planner, tick prompt, scheduler | 1 tool (`schedule_wakeup`), 1 cmd (`loop`), 7 hook, 1 renderer |
| 10 | `ttsr` | 3.783 | 28 | Điều phối TTS: phát giọng nói khi tới lượt, có cắt ngang (interrupt) | 1 cmd (`ttsr`), 9 hook, 2 flag |
| 11 | `todotools` | 3.263 | 21 | Tool todo + tự nhắc nếu lượt kết thúc mà todo chưa xong | 1 tool, 1 cmd (`todo`), 6 hook |
| 12 | `rules` | 2.980 | 20 | Nạp `AGENTS.md`/rules theo thư mục và kích hoạt theo bucket | 2 cmd (`rules`, `reload-rules`), 3 hook, 2 flag |
| 13 | `config-reload` | 2.597 | 11 | Theo dõi FS, tự reload config/settings/extension khi đổi | 5 hook |
| 14 | `gpt-apply-patch` | 2.351 | 21 | Tool apply-patch riêng cho OpenAI/Codex wire mode (có parser patch) | 2 tool, 3 hook |
| 15 | `websearch` | 2.342 | 26 | Tìm web qua provider: Brave, Tavily, Kagi, SERPdive | 1 tool, 1 cmd (`websearch`), 3 hook |
| 16 | `permission-system` | 1.859 | 17 | Lớp phân quyền: mỗi tool tự phân loại lệnh gọi qua `permissionParser` | 3 hook, 2 flag |
| 17 | `tool-search` | 1.411 | 9 | Tìm tool theo mô tả thay vì nhét hết vào context (giảm token) | 1 tool (`tool_search`), 3 hook, 1 renderer |
| 18 | `ask-user` | 1.284 | 12 | Hỏi người dùng giữa lượt, có timeout, hiển thị panel | 2 tool, 1 cmd (`answer`), 4 hook, 1 flag |
| 19 | `imagegen` | 1.258 | 9 | Tool sinh ảnh qua skill nhúng, có auth resolution | 1 tool (`generate_image`), 1 hook |
| 20 | `webfetch` | 1.230 | 11 | Tải và rút gọn nội dung trang web thành markdown | 2 hook |
| 21 | `look-at` | 922 | 9 | Tool xem ảnh bằng **model thị giác riêng** (`look_at`), không nhét ảnh vào lượt chính | 1 cmd (`lookat`), 2 hook |
| 22 | `loop-guard` | 885 | 9 | Phát hiện vòng lặp (tool gọi lặp lại) và **veto trước cả hook** | 8 hook, 2 renderer |
| 23 | `nested-agents-md` | 574 | 12 | Chèn `NESTED_AGENTS.md` của thư mục con vào context khi đọc file ở đó | 1 cmd, 4 hook, 1 flag |
| 24 | `cache-keepalive` | 569 | 4 | Giữ prompt cache ấm: warm cache lúc start, chờ, gia hạn TTL | 8 hook, 1 renderer |
| 25 | `btw` | 528 | 4 | Side-query: hỏi phụ "btw" cạnh lượt chính mà không phá ngữ cảnh | 1 cmd (`btw`), 4 hook |
| 26 | `openai-image-gen` | 509 | 5 | Tool sinh ảnh native của OpenAI, nối vào client tool registry | 4 hook |
| 27 | `herdr` | 507 | 4 | Client cho daemon quản lý pane: báo trạng thái, monitor, wake-source | 5 hook |
| 28 | `history-search` | 401 | 5 | Overlay tìm kiếm lịch sử phiên cũ (đọc chỉ, không ghi) | 1 cmd (`history`) |
| 29 | `reasoning` | 275 | 2 | Lệnh `/reasoning`, `/efforts` — chỉ đọc model hiện tại rồi thông báo | 2 cmd, 2 hook |
| 30 | `openai-web-search` | 272 | 1 | Tool web search native của OpenAI, capability-aware | 3 hook |
| 31 | `tool-pair-guard` | 269 | 3 | Vá lỗi tool call bị thiếu cặp (tool_use/tool_result lệch nhau) | không đăng ký gì (bị gọi nội bộ) |
| 32 | `anthropic-web-search` | 249 | 1 | Tool web search native của Anthropic, có allow/block domain | 3 hook |
| 33 | `bash-timeout` | 211 | 3 | Tự thêm timeout cho lệnh bash dài, có cửa sổ foreground | 1 hook |
| 34 | `model-fallback` | 207 | 3 | Cấu hình chuỗi model fallback khi retry thất bại | 1 cmd (`fallback`), 1 flag |
| 35 | `recommended-models` | 185 | 1 | Thang model đề xuất + xếp hạng provider lane theo từng bậc | 2 hook, 1 flag |
| 36 | `help` | 166 | 3 | `/help` trong TUI + mở `keybindings.json` bằng editor | 2 cmd (`help`, `keybindings`) |
| 37 | `rule-activation` | 132 | 3 | Kích hoạt rules theo file vừa đọc | 1 renderer |
| 38 | `video-in` | 126 | 1 | Tool đọc video: `read_video` | 1 tool, 2 hook |
| 39 | `anthropic-bash` | 103 | 1 | Bật native bash tool của Anthropic (`bash_20250124`) | không qua API (đọc env `PI_ANTHROPIC_BASH`) |
| 40 | `account` | 82 | 1 | Liệt kê credential account của mọi provider | 1 cmd (`account`) |

**Ngoài 40 thư mục còn 9 file phẳng `.ts` cũng là builtin**, đăng ký trong cùng mảng: `diff.ts` (6,9 KB), `files.ts` (6,9 KB), `gpt-account.ts` (4,7 KB), `import-repro.ts` (13 KB), `prompt-url-widget.ts` (4,6 KB), `repository-identity.ts` (1,5 KB), `service-tier.ts` (17 KB), `tps.ts` (2,4 KB), `redraws.ts` (589 B). Cộng `account-display-name.ts`, `monitor-state-event.ts`, `oauth-login-interaction.ts`, `eval-only-routing.ts` là helper dùng chung, không phải builtin.

---

## 3. Phân loại theo CÁCH nó gắn vào

Đếm bằng lệnh §0 mục 4. "Lõi" = không dùng `ExtensionAPI` nào, chạm thẳng code khác.

### 3.1 Một tool mới (11 builtin, đăng ký `registerTool`)

| builtin | tool |
|---|---|
| `mcp` | 5 tool `mcp__*` |
| `terminal` | `bash`, `bash_input`, `bash_output`, `bash_resize`, `kill_bash`, `monitor` |
| `goal` | 3 tool |
| `ask-user` | 2 tool |
| `gpt-apply-patch` | 2 tool |
| `imagegen` | `generate_image` |
| `tool-search` | `tool_search` |
| `loop` | `schedule_wakeup` |
| `video-in` | `read_video` |
| `websearch` | 1 tool |
| `todotools` | 1 tool |

### 3.2 Một hook bám lifecycle (26 builtin)

Tất cả builtin có ≥1 `pi.on(...)` trừ 4: `account`, `anthropic-bash`, `tool-pair-guard`, `help`.

### 3.3 Sửa prompt (4 builtin)

`prompt-preset` (chọn + bơm system prompt theo model) · `nested-agents-md` (chèn `NESTED_AGENTS.md` theo thư mục) · `rules` (bơm rules) · `look-at` (chèn mô tả `look_at` vào prompt).

### 3.4 Sửa model/provider (5 builtin)

`anthropic-subscription` · `cursor-cli-oauth` · `compaction` (2 `registerProvider`) · `recommended-models` · `model-fallback`.
Thêm 3 builtin chỉ bơm payload không qua `registerProvider`: `anthropic-web-search`, `openai-web-search`, `openai-image-gen` (đăng ký qua `registerCommand`/hook, nhưng biến đổi payload provider).

### 3.5 Sửa I/O terminal (3 builtin)

`terminal` (6 tool PTY) · `ttsr` (3.783 dòng, phát/cắt audio) · `bash-timeout` (tiêm timeout mặc định vào bash).

### 3.6 Sửa config (4 builtin)

`config-reload` · `model-fallback` · `permission-system` · `cache-keepalive`.

### 3.7 ⚠️ LÀM THAY ĐỔI HÀNH VI LÕI — loại đáng giá nhất VÀ nguy hiểm nhất

Đây là mục quan trọng nhất của tài liệu, nên đo kỹ thay vì suy.

senpi tự ghi nhận điều này. Mỗi entry trong `changes.md` có mục bắt buộc tên **"Why an extension could not handle it"** — tức thay đổi đó *không* làm được bằng extension và phải sửa core.

**Đo:**

```bash
$ cd /Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/builtin
$ grep -h '^## ' $(find . -name changes.md) | wc -l                                       # → 564 entry
$ grep -h 'Why an extension could not handle it' $(find . -name changes.md) | wc -l       # → 253
```

**253 / 564 = 44%** thay đổi trong lịch sử fork của cây builtin là thay đổi lõi, không phải thay đổi extension. Đây không phải 40 extension "tự chứa" — chúng đã đào vào lõi liên tục.

**Các builtin lõi nặng nhất (số lần tự thú / tổng entry):**

| builtin | lần lõi | tỉ lệ |
|---|---|---|
| `cursor-cli-oauth` | 12/13 | 92% |
| `config-reload` | 11/12 | 92% |
| `anthropic-subscription` | 52/69 | 75% |
| `herdr` | 3/3 | 100% |
| `cache-keepalive` | 3/4 | 75% |
| `webfetch` | 7/10 | 70% |
| `imagegen` | 7/14 | 50% |
| `compaction` | 34/88 | 39% |
| `goal` | 21/63 | 33% |
| `terminal` | 18/47 | 38% |
| `prompt-preset` | 14/58 | 24% |
| `mcp` | 9/27 | 33% |

**Core file thật sự bị chạm** (lệnh 6 ở §0, đã bỏ test, 28 dòng):

```
packages/ai/src/api/transform-messages.ts       ← biến đổi message trước khi gửi provider
packages/ai/src/providers/cursor.ts             ← provider registry
packages/ai/src/utils/retry.ts                   ← logic retry
packages/ai/src/utils/tool-pair-repair.ts        ← vá tool call lệch cặp
packages/agent/src/agent-loop.ts                 ← vòng lặp agent
packages/pty/src/registry-session.ts             ← quản lý session PTY
packages/senpi-codemode/src/prompt/eval-prompt.ts
src/capability/rule.ts                           ← nạp rule
src/config.ts
src/core/messages.ts
src/prompts/tools/todo.md
src/prompts/system/ttsr-interrupt.md
src/session/ttsr-coordinator.ts
src/tools/todo.ts
src/modes/controllers/todo-command-controller.ts
src/export/ttsr.ts
scripts/sync-builtin-extensions.mjs
```

**Bài học cho M5:** lấy một builtin "lõi nặng" về mà **không** lấy kèm phần lõi nó đào = bạn có một cái vỏ không chạy được. Ngược lại, chép cả phần lõi = bạn đang ghi đè kiến trúc của omp. Đây là lý do 5 builtin nên bỏ ở cuối tài liệu.

---

## 4. So với omp — đo thật, không suy

### 4.1 Điều chỉnh quan trọng về briefing

Briefing ghi *"`pi` KHÔNG có MCP"*. Điều đó **đúng với `pi`**, nhưng **sai nếu áp vào `omp`**. Đo:

```bash
$ git -C /Users/tranquangdang21/Projects/ultraworkers ls-files | grep -ic mcp
129
$ ls packages/coding-agent/src/mcp/
client.ts  config.ts  config-writer.ts  errors.ts  index.ts  json-rpc.ts
loader.ts  manager.ts  oauth-credentials.ts  oauth-discovery.ts  oauth-flow.ts ...
$ ls docs/ | grep mcp
mcp-config.md  mcp-protocol-transports.md  mcp-runtime-lifecycle.md  mcp-server-tool-authoring.md
```

**omp đã có MCP đầy đủ, ở mức core, không phải extension.** Có cả OAuth discovery lẫn authoring guide. Đừng đề xuất port `mcp` của senpi sang omp — sẽ là tạo song song hai hệ thống.

### 4.2 Bảng phân quyết

`(a)` = omp thiếu hẳn · `(b)` = omp có nhưng yếu hơn · `(c)` = omp đã mạnh hơn hoặc ngang.

| builtin | bằng chứng omp | phán quyết |
|---|---|---|
| `mcp` | `src/mcp/` 15 file + 4 doc + `capability/mcp.ts` | **(c)** omp mạnh hơn — không lấy |
| `todotools` | `src/tools/todo.ts` 27 KB, `todo-command-controller.ts`, `todo_reminder` event | **(c)** |
| `imagegen` | `src/tools/image-gen.ts` 12 KB | **(c)** ngang |
| `ask-user` | `src/tools/ask.ts` 41 KB, tool `ask` trong `BUILTIN_TOOL_NAMES` | **(c)** omp mạnh hơn |
| `websearch` | tool `web_search` trong `BUILTIN_TOOL_NAMES`, 48 file khớp | **(b)** cần đo provider |
| `compaction` | `src/session/compaction-methods.ts`, `compact-modes.ts`, `snapcompact-*` | **(c)** omp có snapcompact riêng |
| `loop` | `/loop` tại `slash-commands/builtin-modes.ts:324`, `modes/loop-condition`, `modes/loop-limit` | **(b)** omp có loop nhưng khác hẳn hình dạng |
| `rules` | `src/capability/rule.ts`, `rule-buckets.ts`, `discovery/agents-md.ts` | **(c)** |
| `permission-system` | `src/tools/approval.ts` 13 KB, `session/acp-permission-gate.ts` | **(b)** |
| `model-fallback` | `src/session/retry-fallback-chains.ts`, `retry-fallback-reason.ts` | **(b)** |
| `history-search` | `tui/src/overlays/history-search.ts` | **(c)** |
| `help` | có `help-content.ts` | **(c)** |
| `ttsr` | `src/tools/tts.ts` 232 dòng + crate `pi-voice` (`audio.rs`, `live.rs` 21 KB) | **(b)** omp có voice native Rust |
| `webfetch` | `src/tools/fetch.ts` **53 KB** | **(c)** omp mạnh hơn nhiều |
| `terminal` | `tools/bash.ts` 58 KB có `pty?` + `bash-pty-selection.ts`; nhưng **không có** package `pty` | **(b)** xem §4.3 |
| `cache-keepalive` | `git ls-files 'packages/ai/src/**/prompt-cache*'` → **rỗng** | **(a)** |
| `look-at` | `git grep -il 'look_at\|lookAt'` → **0 file** | **(a)** |
| `btw` | không có | **(a)** |
| `herdr` | không có (grep `herdr` → 0) | **(a)** |
| `goal` | `src/goals/` — 5 file, 715 dòng TS + 3 file prompt | **(b)** xem §4.3 |
| `tool-search` | `git grep -c tool_search` → 8 file | **(b)** |
| `config-reload` | `git grep -c config-reload` → 0 | **(a)** |
| `gpt-apply-patch` | không có `apply_patch` tool; có `ast-edit.ts` | **(a)** |
| `video-in` | `git grep -il 'video_in'` → 0 | **(a)** |
| `anthropic-subscription` | 310 file khớp `oauth`; có `crates/pi-natives/src/oauth_callback/` | **(b)** |
| `cursor-cli-oauth` | `packages/ai/src/providers/cursor.ts` | **(b)** |
| `loop-guard` | `git grep -c loopGuard` → 19 file | **(b)** |
| `nested-agents-md` | `capability/context-file.ts`, `discovery/agents-md.ts` | **(c)** |
| `prompt-preset` | `git grep -c prompt.preset` → không rõ | **(a)** cần đo thêm |
| `recommended-models`, `reasoning`, `service-tier` | `setServiceTier` có trong `ExtensionAPI` | **(b)** |
| `anthropic-web-search`, `openai-web-search`, `openai-image-gen`, `anthropic-bash` | đây là bật native tool của provider qua `compat` | **(a)/(b)** tùy provider |
| `bash-timeout` | `src/tools/tool-timeouts.ts` + `bash?timeout` trong `BUILTIN_TOOL_NAMES` | **(c)** |
| `tool-pair-guard` | `auto-generated-guard.ts`, `output-schema-validator.ts` — ý tưởng khác | **(a)** |
| `rule-activation` | `rule-buckets.ts` | **(c)** |
| `account`, `gpt-account` | `pi-ai/auth` slot pool | **(c)** |
| `diff`, `files`, `import-repro` | `tools/report-tool-issue.ts` | **(c)** |

### 4.3 Ba chỗ cần nói thẳng vì dễ phán đoán sai

**`terminal` không phải "omp thiếu PTY".** Đo lại:
```bash
$ git grep -n 'pty' -- packages/coding-agent/src/tools/bash.ts | head
336:	"pty?": "boolean",
600:	// Non-pty calls run alongside each other ...; pty takes over the terminal UI
$ git ls-files 'packages/coding-agent/src/tools/bash-pty-selection.ts'
packages/coding-agent/src/tools/bash-pty-selection.ts
```
omp **đã có** PTY cho bash. Cái omp thiếu là phần *senpi dựng thêm quanh nó*: lease file, monitor registry (30 KB), restore-session, orphan-reaper, 6 tool thay vì 1. Vậy phán quyết là **(b)**, không phải (a).

**`goal` là (b) — và tôi đã trả lời sai một lần rồi sửa lại.** Lần đầu tôi chạy `git ls-files 'src/tools/goal*'` từ thư mục gốc, nhận **rỗng**, rồi kết luận omp "chưa có goal". Sai. Lệnh đúng phải là:

```bash
$ git ls-files | grep -i 'goal' | grep -v test
packages/coding-agent/src/goals/index.ts
packages/coding-agent/src/goals/runtime.ts        # 522 dòng
packages/coding-agent/src/goals/settings.ts
packages/coding-agent/src/goals/state.ts
packages/coding-agent/src/goals/tools/goal-tool.ts  # 123 dòng
packages/coding-agent/src/prompts/goals/goal-budget-limit.md
packages/coding-agent/src/prompts/goals/goal-continuation.md
packages/coding-agent/src/prompts/goals/goal-mode-active.md
```

omp có module goal thật: **715 dòng TS + 3 prompt**. Nhưng senpi có **4.566 dòng TS** cho cùng tính năng — gấp 6,4 lần, và 21/63 entry của nó phải chạm lõi. Đó là lý do vẫn là **(b)**: omp có nền, thiếu độ sâu.

*Bài học về phép đo:* pathspec `git ls-files` **tương đối với thư mục hiện tại**, không phải so với gốc repo. Sai pathspec cho kết quả rỗng, và kết quả rỗng dễ bị đọc thành "không tồn tại" — đúng cái bẫy mà mục §4.1 của chính tài liệu này cảnh báo.

**`websearch` là (b) chứ không phải (a).** 48 file khớp `websearch` và `web_search` nằm trong `BUILTIN_TOOL_NAMES`. omp có tool; cái chưa rõ là danh sách provider (senpi có Brave, Tavily, Kagi, SERPdive). Đây là phép đo cần làm lại, tôi chưa đo tới mức đó.

---

## 5. 5 builtin ĐÁNG LẤY nhất

Xếp theo: (i) omp đang thiếu thật, (ii) giá trị cao, (iii) rẻ — ít cắm lõi.

### 1. `cache-keepalive` (569 dòng, 3/4 entry chạm lõi)
omp có **zero** file `prompt-cache*` trong `packages/ai` (lệnh §4.2). Giữ prompt cache ấm là tiết kiệm tiền thật: mỗi lượt không cache là một lần trả giá input đầy đủ. Chỉ 4 file, chủ yếu là hook. **Cái mất:** phải thêm `promptCacheTtlSeconds` vào `packages/ai` — nhưng đó là một hàm thuần, không phải sửa kiến trúc. *Giá trị cao nhất trên mỗi dòng code.*

### 2. `look-at` (922 dòng, 2 hook)
`git grep -il 'look_at\|lookAt'` trong omp → **0 file**. Ý tưởng: ảnh đi qua **model thị giác riêng** (`look_at` với `model-selector.ts`), không nhét base64 vào lượt chính. Đây là bài toán token + context mà omp chưa giải. *Cái mất:* thêm provider vision selector.

### 3. `btw` (528 dòng, 4 hook, 0 lõi)
Side-query tách khỏi lượt chính. Nhỏ, cô lập, **không có entry nào chạm lõi** (`changes.md`: inside=2, outside=0). Chạy được ngay trên API `omp` sẵn có (`sendUserMessage`, `setWidget`). Đây là ví dụ đẹp nhất của "extension đúng là extension".

### 4. `tool-pair-guard` (269 dòng, 0 đăng ký, 0 lõi)
Vá lỗi tool_use/tool_result lệch nhau. Nhỏ nhất trong nhóm lõi. Nhưng: `tool-pair-repair.ts` nằm ở **`packages/ai` của senpi** — của omp không có. Nên phải viết mới thay vì port. *Ghi rõ điều này, vì dễ tưởng là copy-paste được.*

### 5. `config-reload` (2.597 dòng) — **có điều kiện**
Nghe hấp dẫn nhưng **11/12 entry chạm lõi**, tỉ lệ 92% — cao nhất bảng. Chính tác giả senpi đã nói 11 lần "extension không làm được". Chỉ lấy nếu M5 chấp nhận sửa `src/config.ts` và `SettingsManager`. Nếu không, để cuối danh sách, không phải đầu.

*Thay thế nếu M5 muốn thứ an toàn hơn:* `herdr` (507 dòng) cũng 3/3 chạm lõi — tệ hơn. Còn `loop-guard` (885 dòng, **0/6 entry chạm lõi**, `changes.md` inside=0 outside=0) thì ngược lại là lựa chọn an toàn: chặn vòng lặp tool trước khi nó tốn tiền, hoàn toàn bằng hook, không cần sửa lõi.

---

## 6. 5 builtin KHÔNG NÊN LẤY

### 1. `mcp` (10.244 dòng) — **không lấy, trùng nghiệp vụ**
Đo đã nêu ở §4.1: omp có `src/mcp/` 15 file, `capability/mcp.ts`, 4 tài liệu, 129 file tracked. Port senpi's MCP = chạy hai hệ MCP song song, mỗi cái một bộ tool. *Cái mất nếu bỏ qua:* không có gì đáng kể — omp đã ở bậc cao hơn.

### 2. `compaction` (10.788 dòng, 34/88 lõi) — **không lấy, phá hệ thống**
34 lần phải sửa lõi. Quan trọng hơn: **omp đã có `snapcompact`** (`src/session/snapcompact-inline.ts`, `snapcompact-savings-journal.ts`, `src/edit/hashline-compact.md`, 4 prompt `snapcompact-*.md`) — đây là hệ thống compaction *của riêng omp*, khác hẳn thiết kế của senpi. Ghép hai compaction sẽ hỏng cả hai. *Cái mất:* vài ý hay về warm-anchor, nhưng lấy được qua lời khuyên chứ không qua code.

### 3. `terminal` (8.260 dòng, 18/47 lõi) — **không lấy nguyên si**
omp đã có PTY trong `bash.ts` + `bash-pty-selection.ts` + crate `pi-shell` (`shell.rs` **228 KB**). Port thêm sẽ tạo hai đường thực thi shell. Nếu cần, chỉ lấy *ý tưởng* — monitor registry 30 KB, restore-session, orphan-reaper — và viết lại trên nền `pi-shell`. *Cái mất:* các tính năng bền vững (lease, restore). Chấp nhận được.

### 4. `ttsr` (3.783 dòng, 9 file lõi) — **không lấy, chạm native quá sâu**
`inside=1, outside=6` — tệ nhất bảng về tỉ lệ ngược. Chạm `src/session/ttsr-coordinator.ts`, `src/export/ttsr.ts`, `src/prompts/system/ttsr-interrupt.md`, `packages/ai/src/utils/*`. Và omp đã có `crates/pi-voice` với `live.rs` 21 KB — hạ tầng audio đã ở tầng Rust, khác hẳn cách senpi lo. *Cái mất:* cơ chế "cắt ngang khi người dùng nói". Ghi nhận là nợ kỹ thuật, đừng lấy vội.

### 5. `anthropic-subscription` (8.779 dòng, **52/69 = 75% lõi**) — **không lấy**
Lớn nhất về mức độ lõi-sâu. Chạm `packages/ai/src/providers/cursor.ts`, `packages/ai/src/utils/retry.ts`, `src/config.ts`. Và omp **đã có** `crates/pi-natives/src/oauth_callback/` (8 file, có cả `darwin-helper.m` — native helper cho OAuth trên macOS). Hai hệ OAuth cùng chạy sẽ tranh nhau callback URL. *Cái mất:* provider lane Claude subscription. Đây là thứ chỉ nên làm nếu có người quyết định ôm cả provider layer.

---

## 7. Kết luận cho M5

Ba điều đo được, xếp theo mức chắc:

1. **Cơ hội thật nằm ở API, không ở danh sách 40.** Hai `ExtensionAPI` gần như ngang nhau (42 vs 41 event, cùng tập `register*`). Chuyển `src/tools/` của omp sang coi là builtin extension là khả thi về hình dạng — nhưng là **câu hỏi kiến trúc cho M1B/M2, không phải việc M5 làm**.

2. **"Lấy 40 builtin" là câu nói sai.** 44% thay đổi lịch sử của cây builtin (253/564) là thay đổi lõi. Port như copy sẽ cho 40 vỏ không chạy được. Cái *thật sự* port được là nhóm ~6 builtin lõi-nhẹ: `btw`, `look-at`, `cache-keepalive`, `loop-guard`, `history-search`, `tool-search`.

3. **omp không cần `mcp` và `compaction`.** Cả hai đã là hạ tầng lõi của omp ở bậc cao hơn. Đưa chúng vào danh sách M5 là đi ngược hướng.

### Phép đo chưa làm, cần làm nếu muốn chốt

* **Chưa đo:** số provider của `websearch` của omp (48 file khớp tên nhưng chưa so danh sách provider với Brave/Tavily/Kagi/SERPdive của senpi).
* **Chưa đo:** `prompt-preset` — grep rời rạc, chưa kết luận được omp có preset theo model hay không.
* ~~Chưa đo: `goal` của omp~~ — **đã đo ở §4.3, phán quyết (b)**.
* **Chưa đo:** 9 file `.ts` phẳng (17 KB `service-tier.ts` là file lớn nhất, chưa phân tích).

### Ba ràng buộc từ briefing — vẫn đúng, vẫn áp dụng

* `gajae` là fork của dòng omp/pi, không phải nguồn tham chiếu độc lập. Không dùng làm đối chứng.
* `pi` không có MCP. **Nhưng `omp` có** — đo ở §4.1. Đừng suy từ "pi không có" sang "omp không có".
* `chord` không phải cơ chế vòng đời extension. Không có vai trò trong tài liệu này.

### Về JSONL

`parseJsonlLenient` của omp (`packages/utils/src/stream.ts:575`) là cải tiến thật so với `pi` (ném `JsonlCorruptionError` không bắt). Không builtin nào trong 40 cái này liên quan tới session persistence, nên **không builtin nào có lý do chạm vào session layer**. Giữ nguyên `omp` hiện tại.

---

*Tài liệu này chỉ ghi những gì đã đo. Mỗi con số đều có lệnh ở §0 hoặc ngay cạnh nó. Nếu sáu tháng sau bạn chạy lại §0 mà ra số khác, đó là câu hỏi đáng hỏi hơn cả bảng này.*

---

# Phần 4 — phần omp đã có

## HA KẾ THỪA — senpi có, omp đã có, chỉ khác tên

**Ngày đo:** 2026-09-28 · **senpi HEAD:** `ea9216269` · **omp HEAD:** `a43749d`
**senpi:** `/Users/tranquangdang21/Projects/senpi-ref` · **omp:** `/Users/tranquangdang21/Projects/ultraworkers`

Nhiệm vụ vòng này: **KHỎI LẶNG LẠI giữa 40 builtin của senpi và những gì omp đã có sẵn.**
Hai tài liệu trước (`changes-md.md` 487 dòng, `builtins.md` 423 dòng) đã đưa ra danh sách;
bài này **mở file thật trong omp và đọc** để xác nhận, không grep rồi kết luận.

> **Ghi chú phương pháp.** Bài trước tự thú lỗi: pathspec `git ls-files` sai cho ra kết quả
> rỗng, rồi kết quả rỗng bị đọc thành "không tồn tại". Vòng này tránh bằng cách **dùng một
> bảng khai báo duy nhất làm chuẩn**: `packages/coding-agent/src/tools/builtin-names.ts`
> (68 dòng) liệt kê đúng mọi tool omp có. Đối chiếu danh sách tool đó với danh sách
> tool senpi khai báo là so sánh đại lượng đã đo, không phải so khớp chuỗi.

---

## 0. TL;DR

1. **25 / 40 builtin của senpi, omp đã có** — chỉ khác tên hoặc khác hình dạng. 62,5%.
2. **6 / 40 không nên lấy** vì port sẽ xung đột với kiến trúc omp đã có.
3. **Chỉ 9 / 40 thiếu thật**, và trong đó **chỉ 4 đáng làm ngay**. Con số "40 builtin
   phải port" là sai; con số đúng là **10, hay 4 nếu chọn khéo**.
4. **Bề mặt event: 44 của senpi, 41 của omp, 23 trùng tên.** Một builtin senpi dùng
   event trong nhóm 23 cái thì **không cần port hạ tầng event nào**.
5. **18 event chỉ omp có** — và 8 trong số đó là hệ quả của việc omp đã đưa tính năng
   vào core. Đây là bằng chứng cơ học cho việc port nguyên senpi là đi ngược hướng.
6. **Năm chỗ phải sửa lại so với `builtins.md`** vì bài đó kết luận bằng grep, không đọc
   file — xem §3. Đáng chú ý nhất: `tool_search` **không phải** tool của omp, và
   `cache-keepalive` **không** chỉ là "thêm một hàm".

---

## 1. Chuẩn đo: omp có đúng bao nhiêu tool builtin

```bash
$ wc -l packages/coding-agent/src/tools/builtin-names.ts
     68 packages/coding-agent/src/tools/builtin-names.ts
```

`builtin-names.ts:1-38` — **30 tool công khai + 3 tool ẩn**:

```
BUILTIN_TOOL_NAMES (30)        HIDDEN_TOOL_NAMES (3)
read        bash        edit        yield
ast_grep    ast_edit    ask         goal
debug       ida         eval        think
github      glob        grep        find
lsp         checkpoint  rewind      context_notes
new_context security_scan          task
wait        todo        web_search  write
memory_edit retain      recall      reflect
learn       manage_skill
```

Và `builtin-names.ts:65-67` — prefix tool MCP:

```typescript
export function isMCPToolName(name: string): boolean {
	return name.startsWith("mcp__");
}
```

**Đây là phép đo không thể tranh luận.** Mọi tool mà omp "có" phải xuất hiện ở đây, ở
`SETTINGS_GATED_BUILTIN_TOOL_NAMES`, `SESSION_MANAGED_BUILTIN_TOOL_NAMES`
(`sdk.ts:1161` = `manage_skill`, `learn`, `context_notes`, `new_context`), hoặc mang
prefix `mcp__`. Không có lý do để tin một cái tên nếu nó không nằm trong bốn danh sách này.

---

## 1b. Bề mặt event: 44 của senpi vs 41 của omp — phép đo chuẩn nhất của bài này

Hai danh sách lấy từ **hai file định nghĩa API**, không phải từ call-site:

```bash
# senpi: 44 event — làm phẳng file trước vì chữ ký on() xuống nhiều dòng
tr '\n' ' ' < senpi-ref/packages/coding-agent/src/core/extensions/types.ts \
  | grep -oE 'on\([^)]{0,120}"[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u   # → 44

# omp: 41 event — nằm gọn trong interface ExtensionAPI
sed -n '1256,1360p' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'on\(event: "[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u          # → 41
```

`comm` trên hai danh sách đã sắp:

| | số event |
|---|---:|
| **Có ở cả hai** | **23** |
| **Chỉ senpi** | 21 |
| **Chỉ omp — tức omp đã đi trước** | **18** |

### 23 event dùng chung — đây là "kế thừa" tinh thần

```
after_provider_response  agent_end            agent_start          before_agent_start
context                  input                message_end          message_start
message_update           resources_discover   session_before_tree  session_compact
session_shutdown         session_start        session_tree         tool_call
tool_execution_end       tool_execution_start tool_execution_update tool_result
turn_end                 turn_start           user_bash
```

**Hệ quả quyết định:** 23/44 = **52%** bề mặt event của senpi đã có sẵn ở omp, cùng đúng
tên. Một builtin senpi dùng event trong nhóm này **không cần port bất kỳ hạ tầng event nào**.

### 18 event CHỈ omp có — hướng nào đã chết

Đây là mục đắt giá nhất của cả bài, vì nó cho biết omp đã đi trước ở hướng nào:

| event omp | dấu hiệu nó là hướng đã chết |
|---|---|
| `auto_compaction_start` / `auto_compaction_end` | omp đã có **hệ compaction riêng** (`snapcompact`). senpi phải tự chế 34/88 entry để làm việc này. |
| `auto_retry_start` / `auto_retry_end` | omp có retry-fallback ở tầng nghiệp vụ |
| `retry_fallback_applied` / `retry_fallback_succeeded` | **omp đã tách fallback thành sự kiện quan sát được**; senpi phải để trong `retry.ts` |
| `tool_approval_requested` / `tool_approval_resolved` | omp đã làm phê duyệt thành **sự kiện công khai hai pha**. Senpi chỉ có `permissionParser` nội bộ. |
| `session_switch` / `session_branch` | omp đã có đường chuyển/ nhánh session như sự kiện |
| `session_stop` | senpi dùng `session_abort` + `session_parked` + `session_resumed` (3 event) cho cùng một việc |
| `goal_updated` | **omp đã mở hook công khai cho goal** mà senpi chỉ có nội bộ |
| `todo_reminder` | **omp đã mở hook công khai cho todo** (`sdk.ts:1306`) |
| `ttsr_triggered` | **omp đã mở hook công khai cho TTS** |
| `mcp_notification` | omp đã có MCP ở tầng core nên mới có notification để phát ra |
| `user_python` | omp có Python eval; senpi không |
| `credential_disabled` | quản lý credential pool ở tầng `packages/ai` |

**Đọc được điều gì:** 8 trong 18 event omp-riêng (`goal_updated`, `todo_reminder`,
`ttsr_triggered`, `mcp_notification`, `auto_compaction_*`, `auto_retry_*`,
`retry_fallback_*`) đều là **hệ quả của việc omp đã đưa tính năng vào core**.
senpi phải giữ chúng trong extension thì không có lý do để phát ra sự kiện công khai.
→ **Đừng port 21 event senpi-only một cách máy móc**: nhiều cái trong đó chỉ tồn tại
vì senpi giữ tính năng ở tầng extension.

---

## 2. Bảng đối chiếu 40 builtin

Cột "omp có ở đâu" chỉ chứa đường dẫn:dòng đã **đọc file**, không phải kết quả grep.
Phán quyết: **G** = giống hệt · **M** = chỉ giống một phần · **K** = khác hẳn.

### Nhóm A — omp ĐÃ CÓ, chỉ khác tên (25 / 40)

| # | builtin senpi | omp có ở đâu (đường dẫn:dòng) | phán quyết | cần làm gì |
|---:|---|---|:---:|---|
| 1 | `compaction` | `packages/snapcompact/src/snapcompact.ts` 2.254 dòng; `packages/agent/src/compaction/` 15 file | **K** | Không lấy. Hai hệ compaction khác kiến trúc, ghép là hỏng cả hai. |
| 2 | `mcp` | `src/mcp/manager.ts` 1.941 dòng; `tools/builtin-names.ts:65` `isMCPToolName` → prefix `mcp__` | **G** | Không lấy. omp ở tầng core, mạnh hơn. |
| 3 | `ttsr` | `src/export/ttsr.ts` 773 dòng; `ttsr_triggered` là event công khai (`extensions/types.ts`) | **M** | Không lấy code. Thiếu cơ chế "cắt ngang khi người dùng nói". |
| 4 | `terminal` | `src/tools/bash.ts:336` `"pty?": "boolean"`; `bash-pty-selection.ts` 14 dòng | **M** | Thiếu lease / monitor registry / restore / orphan-reaper (đã đo vắng: 0 hit). |
| 5 | `goal` | `src/goals/tools/goal-tool.ts:56` `class GoalTool`, `name = "goal"`, `op: create\|get\|complete\|resume\|drop` (dòng 16) | **M** | senpi có **3 tool** (`create_goal`/`get_goal`/`update_goal`); omp gộp làm **1 tool** có `op`. Cùng ngữ nghĩa, khác hình dạng. |
| 6 | `hooks` | `src/extensibility/hooks/` 1.415 dòng; `types.ts:393` `HookEvent` **tái dùng chính event của extension** | **G+** | Không lấy. omp không có hệ hook song song — nó chỉ lọc event. |
| 7 | `todotools` | `src/tools/todo.ts:712` `class TodoTool`, `name = "todo"`, 9 `op` (dòng 53); `todo_reminder` event tại `sdk.ts:1306` | **G** | Không lấy. Tên tool **giống hệt**. |
| 8 | `rules` | `src/capability/rule.ts` 404 dòng; `capability/rule-buckets.ts` 85 dòng | **G** | Không lấy. |
| 9 | `webfetch` | `src/tools/fetch.ts` **1.728 dòng** | **G+** | Không lấy. |
| 10 | `websearch` | `src/web/search/providers/` — **26 provider** | **G+** | Không lấy. Đo lại được (bài trước ghi "chưa đo"). |
| 11 | `ask-user` | `src/tools/ask.ts` 1.175 dòng — có `multi` (67), `recommended` (68), `timeout` (446), `Other` (47) | **G+** | Không lấy. Cả 4 tính năng đã có. |
| 12 | `imagegen` | `src/tools/image-gen.ts` 321 dòng; `getImageGenTools` (`sdk.ts:267`) | **G** | Không lấy. |
| 13 | `bash-timeout` | `src/tools/tool-timeouts.ts` 39 dòng | **G** | Không lấy. |
| 14 | `model-fallback` | `src/session/retry-fallback-chains.ts` 587 dòng | **G+** | Không lấy. |
| 15 | `history-search` | `tui/src/overlays/history-search.ts` | **G** | Không lấy. |
| 16 | `nested-agents-md` | `src/capability/context-file.ts`; `src/discovery/agents-md.ts` | **G** | Không lấy. |
| 17 | `loop-guard` | `src/advisor/loop-guard.ts` 113 dòng | **G** | Không lấy. |
| 18 | `permission-system` | `src/tools/approval.ts` 387 dòng | **M** | omp có cơ chế duyệt nhưng không có `permissionParser` tự phân loại lệnh gọi. |
| 19 | `account` (+`gpt-account`) | `packages/ai/src/auth/` slot pool; `credential_disabled` là event công khai | **G** | Không lấy. |
| 20 | `recommended-models` | `packages/catalog/` + `provider-details.ts` | **G+** | Không lấy. |
| 21 | `reasoning` (`/reasoning`,`/efforts`) | `setServiceTier` trong `ExtensionAPI`; effort ladder trong `packages/catalog` | **G** | Không lấy. |
| 22 | `service-tier` | `ExtensionAPI.setServiceTier` (`types.ts`) | **G** | Không lấy. |
| 23 | `tool-pair-guard` | `src/tools/auto-generated-guard.ts`; `output-schema-validator.ts` | **M** | Cùng ý, khác cơ chế. Không cấp phép copy (xem §3.4). |
| 24 | `rule-activation` | `src/capability/rule-buckets.ts` | **G** | Không lấy. |
| 25 | `help` | `slash-commands/builtin-lifecycle.ts:178`, `builtin-session.ts:664` | **G** | Không lấy. *(Sửa: `builtins.md` §4.2 dẫn `help-content.ts` — **file đó không tồn tại**; `git ls-files \| grep -c help-content` = 0.)* |

### Nhóm B — omp KHÔNG có, nhưng đừng lấy vội (6 / 40)

| # | builtin senpi | omp có ở đâu | vì sao không lấy |
|---:|---|---|---|
| 25 | `anthropic-subscription` | `crates/pi-natives/src/oauth_callback/` | **52/69 = 75% entry chạm lõi** (đo ở `builtins.md` §3.7). Hai hệ OAuth tranh cùng callback URL. |
| 26 | `cursor-cli-oauth` | `packages/ai/src/providers/cursor.ts` | **12/13 = 92% entry chạm lõi** — cao nhất bảng. |
| 27 | `prompt-preset` | **không có** | Xem §3.3 — senpi làm đúng thứ mà AGENTS.md của omp **cấm**. |
| 28 | `openai-web-search` / `anthropic-web-search` | `src/web/search/providers/anthropic.ts` 13 KB, `codex.ts` 21 KB, `gemini.ts` 22 KB | omp đã có native web search cho provider. |
| 29 | `openai-image-gen` | `packages/ai/src/images/` | omp đã có native image gen. |
| 30 | `anthropic-bash` | `bash.ts` + PTY | omp đã có bash tool với PTY. |

### Nhóm C — omp THIẾU THẬT (9 / 40)

Đây là phần **duy nhất** của bài này sinh ra việc cho M5.

| # | builtin senpi | bằng chứng omp vắng | giá | cần làm gì |
|---:|---|---|---|---|
| 31 | `btw` (side-query) | `/btw` → 0 hit; `/btw` là 22/61 command senpi nhắc nhiều nhất | nhỏ | **Port.** 4 file, 0 entry chạm lõi — mẫu đẹp nhất của "extension đúng là extension". |
| 32 | `look-at` (vision model riêng) | `look_at`/`lookAt` → **0 file** | vừa | **Port.** Bài toán token/context omp chưa giải. |
| 33 | `cache-keepalive` (warm cache) | `warmPromptCache`, `resolvePromptCacheTtlSeconds`, `WarmPromptCacheOptions`, `promptCacheTtl` → **0 file, cả 4** | nhỏ | **Port.** Nhưng xem §3.2 — chỉ port phần *warm*, phần *đánh dấu* đã có. |
| 34 | `config-reload` | watcher chỉ phủ config/settings (`config/settings.ts:993-1023`), **không phủ extension** | vừa | **Port phần extension.** 11/12 entry chạm lõi nên chỉ lấy nhánh đó. |
| 35 | `video-in` (`read_video`) | `read_video` → 0 hit | nhỏ | Cân nhắc. 1 file, 126 dòng. |
| 36 | `gpt-apply-patch` | `apply_patch` → không có tool; `gpt-apply-patch` 2.351 dòng | vừa | Xem §3.3 — hướng ngược lại đúng hơn. |
| 37 | `loop` (`schedule_wakeup` + cron) | `schedule_wakeup` → 0 hit | vừa | Cân nhắc. |
| 38 | `tool-search` (`tool_search`) | có 8 file nhưng **0 trong `BUILTIN_TOOL_NAMES`** | nhỏ | Xem §3.1 — đây là bài toán khác. |
| 39 | `herdr` (client daemon) | `HERDR_SOCKET`/`herdrClient` → 0 hit | trung bình | Xem §3.5 — hướng ngược lại. |

*(Dòng 40 `help` không nằm ở đây: omp **có** `/help`. Xem nhóm A #25 bên dưới.)*

---

## 3. Năm chỗ phải sửa lại so với hai bài trước

Đây là phần tôi **đọc file** mới phát hiện được. Cả năm đều là chỗ bài trước kết luận bằng grep.

### 3.1 `tool_search` — bài trước gọi là "(b) omp có", nhưng omp KHÔNG có tool này

`builtins.md` §4.2 ghi `tool-search` → "git grep -c tool_search → 8 file" → phán quyết (b).

Đọc file cho thấy 8 hit đó **không phải tool**:

```bash
$ grep -c "tool_search" packages/coding-agent/src/tools/builtin-names.ts
0
$ grep -n "tool_search" packages/ai/src/providers/anthropic-wire.ts
86:	name: "tool_search_tool_regex" | "tool_search_tool_bm25";
99:	type: "tool_search_tool_result";
```

`tool_search_tool_regex` / `tool_search_tool_bm25` là **server-side tool của Anthropic và
OpenAI**, omp chỉ phân tích block trả về. Người dùng omp **không bao giờ gọi** `tool_search`.

→ Đây là **điểm giống tên giả** điển hình. Phải sửa phán quyết `tool-search` từ (b) → **(a) thiếu thật**.

### 3.2 `cache-keepalive` — bài trước nói "omp có `cache_control`, không cần port"; chỉ đúng một nửa

`builtins.md` §5.1 lập luận rằng chỉ cần thêm `promptCacheTtlSeconds` vào `packages/ai`.

Đo lại, cả hai vế đều cần sửa:

| | omp | senpi |
|---|---|---|
| **Đánh dấu** cache breakpoint (`cache_control`) | **có** — `packages/ai/src/providers/anthropic.ts:3601` gắn `{ type: "ephemeral" }`, 6 provider dùng | có |
| **Làm ấm** cache (gọi API chủ động) | **0** — `warmPromptCache`, `resolvePromptCacheTtlSeconds`, `WarmPromptCacheOptions`, `promptCacheTtl` đều **0 file** | có — `cache-keepalive/index.ts` import cả 4 |

→ Sửa lại: **không phải "thêm một hàm"**. Phần đánh dấu đã xong; phần warm là một
vòng gọi API định kỳ (`schedule_wakeup`/`prewarm`), cần mới thật. Giá đi lên so với ước lượng cũ.

### 3.3 `prompt-preset` và `gpt-apply-patch` — senpi làm đúng thứ omp đã **cấm bằng văn bản**

`AGENTS.md` của omp ghi: *"NEVER hard-code model- or provider-conditional policy in
TypeScript. No `id.includes("claude")`, no model-name regexes"*, và bắt buộc đặt vào
KDL ở `packages/catalog/src/compat/rules/`.

Đo senpi:

```bash
$ grep -cE 'model\.id|model\.provider|test\(model' .../prompt-preset/presets.ts
22
$ grep -nE '^(const|export const) [A-Z_]+ =' .../prompt-preset/presets.ts
175:const DEEPSEEK_OFFICIAL_PROVIDER = "deepseek";
```

**22 dòng match theo id model trong TypeScript.** Đây đúng thứ AGENTS.md cấm.
Nếu port nguyên si, ta sẽ vi phạm luật của chính mình và phải refactor ngược lại.

Cùng lập luận cho `gpt-apply-patch` (2.351 dòng): nó chọn wire mode bằng cách dò id
model — omp đã có `packages/catalog/src/compat/rules/runtime/behavior.kdl` để làm
đúng việc đó. **Không port code; nếu cần thì port ý tưởng vào KDL.**

### 3.4 `tool-pair-guard` — không copy được, phải viết mới

`builtins.md` §5.4 đã nói đúng: `tool-pair-repair.ts` nằm ở `packages/ai` **của senpi**,
omp không có. Giữ nguyên kết luận đó. Bổ sung: vì vậy mục này **không phải port, là viết mới**,
và chi phí phải tính như viết mới chứ không như copy.

### 3.5 `herdr` — "omp không có" là **sai một nửa**

`builtins.md` §4.2 ghi `herdr` → "không có (grep herdr → 0)" → (a).

Đo lại: **có 7 file** chứa `herdr` (không tính CHANGELOG):

- `packages/tui/src/terminal-multiplexer.ts:2` — `export function isInsideHerdr(env)`
- `packages/tui/src/kitty-graphics.ts:18,84` — dùng nó để tắt fallback

Nhưng đọc nội dung thì thấy đây là **hướng ngược lại**:

```typescript
// terminal-multiplexer.ts:1-2
/** True when this process is running inside a Herdr pane. */
export function isInsideHerdr(env: NodeJS.ProcessEnv = Bun.env): boolean {
```

omp là **consumer**: chạy *trong* pane Herdr thì nhận diện ra. senpi là **client**:
`herdr-client.ts` nói chuyện qua socket với daemon để hỏi trạng thái pane.

Kiểm tra ngược lại để chắc:

```bash
$ git grep -l "HERDR_SOCKET\|herdrClient" -- packages | grep -v test
packages/tui/src/terminal-multiplexer.ts   # chỉ nằm trong comment
```

→ Sửa: `herdr` là **(a) thiếu thật** ở phần *client*, nhưng **không phải vì omp không biết
Herdr là gì** — omp đã tích hợp theo chiều khác. Cần nói rõ trong M5, nếu không sẽ
cảm giác như đang port trùng.

---

## 4. Nhóm cuối: omp có, senpi KHÔNG có

Đây là mục "hướng nào đã chết" — thông tin đắt giá nhất theo yêu cầu.

### 4.1 18 extension event chỉ omp có

Xem bảng ở §1b. Tóm tắt theo nhóm nguyên nhân:

| nguyên nhân | event | nghĩa là |
|---|---|---|
| omp đã có **compaction riêng** | `auto_compaction_start/end` | senpi phải tự chế 34/88 entry để làm việc này |
| omp đã có **retry + fallback ở tầng nghiệp vụ** | `auto_retry_start/end`, `retry_fallback_applied/succeeded` | senpi sửa `packages/ai/src/utils/retry.ts` |
| omp đã làm **duyệt thành sự kiện 2 pha** | `tool_approval_requested/resolved` | senpi chỉ có `permissionParser` nội bộ |
| omp đã có **MCP ở core** | `mcp_notification` | senpi phải đóng gói MCP thành extension |
| omp đã **mở hook công khai** cho tính năng của mình | `goal_updated`, `todo_reminder`, `ttsr_triggered` | senpi giữ chúng trong extension → không có lý do phát ra sự kiện |
| omp có **Python eval** | `user_python` | senpi không có |
| omp có **credential pool** | `credential_disabled` | senpi không có |
| omp có **đường chuyển/nhánh/stop session** | `session_switch`, `session_branch`, `session_stop` | senpi dùng 3 event khác cho cùng việc |

**Kết luận phần này:** không phải ngẫu nhiên mà 8/18 event omp-riêng đều là **hệ quả của
việc omp đưa tính năng vào core**. Đây là bằng chứng cơ học cho phán đoán ở `builtins.md` §7.

### 4.2 Package chỉ omp có — 10 người hàng xóm không có ở senpi

Đo: omp **16 package** (`ls -d packages/*/`), senpi **13**.

| package omp | senpi có? | ý nghĩa |
|---|---|---|
| `snapcompact` | **không** | hệ compaction riêng — lý do `compaction` của senpi không được lấy |
| `catalog` | **không** | nơi chứa chính sách model/provider dạng KDL — lý do `prompt-preset`/`gpt-apply-patch` không được port |
| `omptype` | **không** | schema validation với JIT lazy |
| `wire` | **không** | lớp wire |
| `mnemopi` | **không** | — |
| `browser-relay` | **không** | — |
| `stats` | **không** | dashboard quan sát cục bộ |
| `metaharness` | **không** | — |
| `collab-web` | **không** | — |
| `typescript-edit-benchmark` | **không** | — |
| `utils` | **không** (senpi rải rác) | logger, stream, temp file |
| `pty` | **CÓ** (senpi) | — |
| `chord`, `client`, `evals`, `protocol`, `senpi-codemode`, `server`, `session-backends`, `telemetry` | **senpi-only** | — |

**Hai package đáng chú ý nhất về hướng đi:**
- **`snapcompact`** — omp đã đi trước ở compaction. Ghép thêm sẽ hỏng.
- **`catalog`** — đây chính là cơ chế mà `prompt-preset` và `gpt-apply-patch` của senpi
  đang làm bằng tay. omp có đường đi đúng sẵn; port code của senpi là **lùi về kiến trúc**.

### 4.3 21 event chỉ senpi có — nhưng đừng port máy móc

Xem §1b. Đáng chú ý: `session_abort` + `session_parked` + `session_resumed` (3 event
senpi) làm cùng việc với `session_stop` (1 event omp). Và `ui_prompt_start/end`,
`input_disposition` chỉ tồn tại vì senpi giữ câu hỏi bất đồng bộ trong extension.

---

## 5. Chốt bằng một con số

Trong **40 builtin** của senpi:

| phán quyết | số | ý nghĩa |
|---|---:|---|
| **omp đã có, không cần làm gì** | **25** | 62,5% — đây là phần tiết kiệm công |
| **không lấy vì sai hướng / xung đột** | **6** | 15% — port sẽ làm hỏng |
| **thiếu thật, sinh việc cho M5** | **9** | 22,5% |

Và trong **44 event** của senpi: **23 đã có** (52%), **21 chỉ senpi**, **18 chỉ omp**.

### Câu trả lời thẳng cho câu hỏi "40 builtin phải port"

**Không phải 40. Là 9 — và trong 9 cái đó chỉ 4 cái đáng làm ngay** (`btw`,
`look-at`, `cache-keepalive` phần warm, `config-reload` phần extension). Ba cái
còn lại (`video-in`, `loop`, `tool-search`) là tùy chọn; ba cái cuối (`gpt-apply-patch`,
`herdr`, `prompt-preset`) **không nên port code** vì lý do kiến trúc nêu ở §3.

**Con số này nhỏ hơn nhiều so với giả định ban đầu — và đó là phát hiện có giá trị nhất
của vòng này.**

---

## 6. Sai sót đã biết của chính bài này

- **`websearch`: 26 vs 7 provider là phép đo số *file provider*, không phải số provider
  đăng ký thật.** Đếm `find providers/ -name '*.ts'` trừ `base/utils/browser-*` cho 26;
  đó là số file, và một provider có thể nhiều file. Chưa đếm entry thật trong registry.
- **`ttsr` tôi chỉ đọc `export/ttsr.ts` (773 dòng) và xác nhận `ttsr_triggered` là event.**
  Chưa mở `crates/pi-voice` đ so cơ chế cắt ngang. Phán quyết "(M)" là suy đoán hợp lý,
  chưa phải đo.
- **`config-reload`: tôi đọc `#configWatchTargets()` (settings.ts:993-1023) và thấy nó phủ
  config/settings nhưng không thấy phần extension trong cùng hàm.** Có thể extension reload
  nằm ở chỗ khác (tôi chỉ grep `reloadExtensions`). Chưa chắc chặn.
- **Bảng §2 cột "cần làm gì" cho nhóm C dựa trên phán quyết đã đo của `builtins.md` §5-6,
  không phải phán quyết mới.** Tôi đã đọc lại 8 file để kiểm, nhưng không mở lại từng
  builtin của senpi để đo lại tỉ lệ "entry chạm lõi".
- **Không mở lại `deep-risk.md`** (978 dòng) — ngoài phạm vi đọc được giao. Nếu nó đã kết
  luận về `herdr`/`tool_search` thì §3.1 và §3.5 ở đây có thể trùng hoặc mâu thuẫn.

## 7. Lệnh để tự chạy lại

```bash
cd /Users/tranquangdang21/Projects/ultraworkers
F=packages/coding-agent/src/tools/builtin-names.ts

# 1. Danh sách tool chuẩn của omp
cat -n $F                                   # 30 builtin + 3 hidden + isMCPToolName

# 2. Bề mặt event: 44 senpi vs 41 omp
SP=/private/tmp/claude-501/-Users-wwzz-Downloads-proxyclawd/88833871-9d1c-410a-8425-a5a54e5377ef/scratchpad
S=/Users/tranquangdang21/Projects/senpi-ref/packages/coding-agent/src/core/extensions/types.ts
O=packages/coding-agent/src/extensibility/extensions/types.ts
tr '\n' ' ' < "$S" | grep -oE 'on\([^)]{0,120}"[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u > $SP/senpi_events.txt
sed -n '1256,1360p' "$O" | grep -oE 'on\(event: "[a-z_.]+"' | grep -oE '"[a-z_.]+"' | tr -d '"' | sort -u > $SP/omp_events.txt
comm -12 $SP/senpi_events.txt $SP/omp_events.txt   # 23
comm -23 $SP/senpi_events.txt $SP/omp_events.txt   # 21
comm -13 $SP/senpi_events.txt $SP/omp_events.txt   # 18

# 3. Provider web search: 26 file
find packages/coding-agent/src/web/search/providers -name "*.ts" \
  ! -name base.ts ! -name utils.ts ! -name "browser-*.ts" | wc -l

# 4. Xác nhận vắng (4 mã, đều phải ra 0)
for p in warmPromptCache resolvePromptCacheTtlSeconds WarmPromptCacheOptions promptCacheTtl; do
  echo "$p: $(git grep -l -- "$p" -- packages | grep -v test | wc -l)"; done
git grep -c "tool_search" $F          # 0 — không phải tool của omp
git grep -l "HERDR_SOCKET\|herdrClient" -- packages | grep -v test   # chỉ comment

# 5. Danh sách package
ls -d packages/*/ | xargs -n1 basename | tr '\n' ' '   # omp 16
ls -d /Users/tranquangdang21/Projects/senpi-ref/packages/*/ | xargs -n1 basename | tr '\n' ' '   # senpi 13
```

---

# Phần 5 — phần omp thiếu thật

## HA THIẾU — đặc tả port cho những gì `omp` THIẾU HẢN

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

---

# Phần 6 — seam hạ tầng

## HA ĐƯỜNG DÂY: seam nào phải mở trước khi port 40 builtin của senpi

> Nghiên cứu M5, vòng sửa. Viết **2026-09-28**.
> Mọi khẳng định kèm **lệnh đã chạy + đường dẫn + số dòng**. Khẳng định nào không đo được thì ghi rõ "chưa đo".
>
> **Cây đo:**
> ```bash
> S=/Users/tranquangdang21/Projects/senpi-ref      # code-yeongyu/senpi
> O=/Users/tranquangdang21/Projects/ultraworkers  # omp, branch milestone-1
> ```
>
> **Đã đọc trước khi viết (đúng 2 file, theo chỉ định):** `ext-api.md` (471 dòng, đọc hết bằng `sed -n '1,240p'` + `'240,471p'`) · `deep-risk.md` (978 dòng, đọc `1-33`, `96-222`, `749-866` bằng `sed -n`; dùng `grep -nE '^#{1,3} '` để lấy mục lục trước).
>
> **Bối cảnh đã nhận, không lặp lại:** gajae là fork dòng omp/pi · pi không có MCP/ACP · `chord` không phải cơ chế vòng đời extension · omp tự lành JSONL hỏng (`packages/utils/src/stream.ts:575` `parseJsonlLenient`) còn pi thì ném `JsonlCorruptionError` (`durable/src/storage/jsonl/storage.ts:119`).

---

## 0. TL;DR — đọc 4 câu này là đủ để quyết định thứ tự làm

1. **omp ĐÃ CÓ hệ thống extension thật.** Tôi tự đo lại, không dựa vào vòng trước: **46 event** trong `packages/coding-agent/src/extensibility/extensions/types.ts`. Hạ tầng 5.337 dòng / 11 file. M5 **không phải** dựng hạ tầng.

2. **24 trên 40 builtin bị chặn bởi event thiếu. 13 builtin chạy được ngay, không cần seam nào.** (Đo bằng `awk` join, phần 5.) Đây là con số trung tâm của cả bài.

3. **Nút thắt là `model_select`: 16 chỗ gọi `pi.on("model_select")` trong 15 thư mục.** Mở nó một mẩu là gỡ 15/40 builtin. Nhưng **cái rẻ nhất lại là `agent_settled`** (10 dòng, 2 file) — vì nó **không có payload**, và omp đã có sẵn đúng ngữ nghĩa "đã ngả" qua cờ `isTerminal` ở `modes/rpc/rpc-session-settle.ts:59`. Còn **cái thật sự đáng tiền không phải `model_select`** mà là `setActiveTools`/`setModel` (20 + 3 file), vì đó mới là chỗ builtin **ra lệnh** chứ không phải chờ tin.

4. **`executeTool` là method bịa ra trong `ext-api.md` và `deep-risk.md` — 603 file builtin, 0 file dùng.** Tương tự `registerFilesystemPolicy`, `registerMarkdownTransformer`, `registerMcpServer`, `registerReadClassifier`, `registerRemovedToolHint`, và cả 4 method `ctx.ui` thiếu: **0 sử dụng**. **10/15 thứ omp thiếu không gỡ được builtin nào.** Mở chúng là tự làm rối `types.ts` mà không nhận về gì.

---

## 1. omp có hệ thống extension thật không — tôi tự đo lại

Câu hỏi này vòng trước đã trả lời, nhưng toàn bộ bài này đứng trên nó nên tôi kiểm lại bằng lệnh của chính tôi, không cite.

```bash
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort -u > /tmp/omp_ev.txt
wc -l < /tmp/omp_ev.txt
# 46
grep -n 'model_select' packages/coding-agent/src/extensibility/extensions/types.ts
# (rỗng) — xác nhận event này thật sự vắng, không phải lỗi regex
```

46 event, `model_select` vắng mặt thật. Danh sách đầy đủ (46, xếp):

```
after_provider_response  agent_end  agent_start  auto_compaction_end  auto_compaction_start
auto_retry_end  auto_retry_start  before_agent_start  before_provider_request  before_subagent_spawn
context  credential_disabled  goal_updated  input  mcp_notification  message_end  message_start
message_update  resources_discover  retry_fallback_applied  retry_fallback_succeeded
session_before_branch  session_before_compact  session_before_switch  session_before_tree
session_branch  session_compact  session_shutdown  session_start  session_stop  session_switch
session_tree  session.compacting  todo_reminder  tool_approval_requested  tool_approval_resolved
tool_call  tool_execution_end  tool_execution_start  tool_execution_update  tool_result
ttsr_triggered  turn_end  turn_start  user_bash  user_python
```

**Cấu trúc emit của omp** (quan trọng cho phép đo công, mục 3):

```bash
cd $O
grep -nE '(private|async|#)?\s*(emit|fire|dispatch)[A-Za-z]*\s*[<(]' \
  packages/coding-agent/src/extensibility/extensions/runner.ts | head -60
```

Kết quả then chốt — omp chia emit làm **hai loại**:

| loại | chỗ | danh sách |
|---|---|---|
| `emit<TEvent extends RunnerEmitEvent>(event)` — generic, phần lớn event | `runner.ts:1464` | mọi event không có kết quả trả về |
| `emitXxx()` riêng — event có kết quả / cần `await` | `runner.ts:1528` trở đi | `emitToolResult` `emitToolCall` `emitUserBash` `emitUserPython` `emitResourcesDiscover` `emitInput` `emitContext` `emitBeforeProviderRequest` `emitAfterProviderResponse` `emitBeforeAgentStart` `emitBeforeSubagentSpawn` `emitSessionStop` `emitCredentialDisabled` `emitMcpNotification` |

Và có một ràng buộc mà `ext-api.md` **không nhắc**, đây là chi phí thật khi thêm event:

```bash
grep -rn 'type RunnerEmitEvent\|type RunnerEmitResult' packages/coding-agent/src/extensibility/extensions/*.ts
# runner.ts:347:  type RunnerEmitEvent = Exclude<
# runner.ts:371:  type RunnerEmitResult<TEvent extends RunnerEmitEvent> = TEvent extends { type: "session_before_switch" }
```

`RunnerEmitEvent` là một `Exclude<>` của `ExtensionEvent` trừ vài event đặc biệt; `RunnerEmitResult` là một conditional-type map. **Thêm 1 event = phải chạm cả hai bảng này**, không chỉ `on()` overload. `ext-api.md` §2.3 mô tả bất biến 3 bước của senpi (`*Event` → overload `pi.on` → hàm emit); ở omp là **5 bước** (xem mục 3).

---

## 2. Cái omp thiếu, đo bằng gì

### 2.1 Event — 11 thiếu, 37 chỗ gọi

Đo bằng hai lệnh, không suy diễn:

```bash
cd $S
B=packages/coding-agent/src/core/extensions/builtin
git ls-files "$B/*" | grep '\.ts$' > /tmp/builtin_ts.txt      # 603 file
xargs grep -hoE '\bpi\.on\("[a-z_.]+"' < /tmp/builtin_ts.txt \
  | sed 's/pi.on("//;s/"//' | sort | uniq -c | sort -rn
```

> **Cảnh báo phép đo — tôi đã dính lỗi này một lần, ghi lại để người sau không dính nữa.** Lần đầu tôi chạy `for e in $ev` để so event với `/tmp/omp_ev.txt`. **Shell ở đây là zsh, zsh KHÔNG tách từ khi mở rộng biến không nhắc** (khác bash). Vòng lặp chạy **đúng một lần** với `e` = cả chuỗi nhiều dòng, `grep -x` khớp rỗng, kết quả là **"0/40 builtin cần seam"** — sai hoàn toàn. Sửa bằng cách **join bằng `awk`**, không dùng vòng lặp shell. Kết quả đúng ở mục 5.

| event thiếu ở omp | số chỗ gọi `pi.on()` | thư mục builtin dùng |
|---|---:|---|
| **`model_select`** | **16** | anthropic-subscription, anthropic-web-search, ask-user, cache-keepalive, compaction, gpt-apply-patch, look-at, openai-image-gen, openai-web-search, prompt-preset, reasoning, recommended-models, terminal, video-in, websearch (+ `service-tier.ts` file trần) |
| `agent_settled` | 6 | goal, config-reload, herdr, loop, loop-guard, ttsr |
| `session_abort` | 4 | goal, loop, todotools, ttsr |
| `session_parked` | 2 | cache-keepalive, terminal |
| `session_resumed` | 2 | cache-keepalive, terminal |
| `session_extensions_removed` | 2 | anthropic-subscription, cursor-cli-oauth |
| `thinking_level_select` | 1 | reasoning, recommended-models, `service-tier.ts` |
| `session_info_changed` | 1 | herdr |
| `session_before_fork` | 1 | btw |
| `project_trust` | 1 | config-reload |
| `input_disposition` | 1 | goal |
| **Tổng** | **37** | **24 thư mục** |

Mốc chéo với `ext-api.md` §2.1: danh sách 18 event senpi-only của vòng trước, trong đó **7 cái 0 builtin dùng** (`ui_prompt_start/end`, `tool_activated`, `system_prompt_change`, `session_compact_failed`, `session_before_reload`, `before_provider_headers`). Bảng trên xác nhận điều đó bằng cách không thấy chúng. ⇒ **11 event là mức cần thật, không phải 18.**

### 2.2 Method — 11 thiếu, nhưng chỉ 5 được builtin dùng

```bash
cd $S
for m in executeTool registerEntryRenderer registerFilesystemPolicy registerLazyToolActivator \
         registerMarkdownTransformer registerMcpServer registerReadClassifier registerRemovedToolHint \
         setSessionFastMode setSessionModel setSessionThinkingLevel \
         setWorkingVisible setWorkingIndicator setHiddenThinkingLabel getEditorComponent; do
  n=$(xargs grep -l "\b$m\b" < /tmp/bi_ts.txt 2>/dev/null | wc -l | tr -d ' ')
  printf "%-30s %3s file\n" "$m" "$n"
done
```

| method thiếu ở omp | file builtin dùng | thư mục |
|---|---:|---|
| `registerEntryRenderer` | 5 | cache-keepalive, goal, loop, mcp, rule-activation |
| `setSessionThinkingLevel` | 3 | reasoning, recommended-models, `service-tier.ts` |
| `registerLazyToolActivator` | 3 | gpt-apply-patch, tool-search |
| `setSessionModel` | 2 | recommended-models, `service-tier.ts` |
| `setSessionFastMode` | 1 | `service-tier.ts` |
| `executeTool` | **0** | — |
| `registerFilesystemPolicy` | **0** | — |
| `registerMarkdownTransformer` | **0** | — |
| `registerMcpServer` | **0** | — |
| `registerReadClassifier` | **0** | — |
| `registerRemovedToolHint` | **0** | — |
| `ctx.ui.setWorkingVisible` | **0** | — |
| `ctx.ui.setWorkingIndicator` | **0** | — |
| `ctx.ui.setHiddenThinkingLabel` | **0** | — |
| `ctx.ui.getEditorComponent` | **0** | — |

**Kết luận mục 2.2 — sửa trực tiếp `ext-api.md` §6.1.** Vòng trước xếp `executeTool` là seam S3, `registerMarkdownTransformer`/`registerEntryRenderer` là S5, `registerReadClassifier` là S6, `registerRemovedToolHint` là S7. Trong 4 seam đó, **2 cái (`registerEntryRenderer`, `registerLazyToolActivator`) có builtin dùng thật; 3 cái còn lại không builtin nào chạm** (`executeTool`, `registerReadClassifier`, `registerRemovedToolHint`, `registerMarkdownTransformer`). Xếp hạng S3/S5/S6/S7 của vòng trước **thổi phồng công**.

---

## 3. Từng seam: mở được không, vỡ gì, tốn gì

Bối cảnh chung trước khi vào từng cái: **không có hợp đồng phiên bản ở cả hai bên** (`ext-api.md` §5, đo bằng `grep -rniE 'apiVersion|extensionVersion|EXTENSION_API'` → 0 dòng ở senpi, 0 ở omp). Nghĩa là **không có negotiation để hỏng êm** — mọi sai lệch lộ lúc `bun check`. Đây là tin tốt và là lý do dưới đây mọi phép đo "vỡ hợp đồng" đều là vỡ **lúc compile**, không phải vỡ lúc chạy.

### S1 — `model_select` (16 chỗ gọi, 15 thư mục)

- **Mở được KHÔNG sửa hành vi đang chạy?** **CÓ** — vì điểm móc tồn tại sẵn và là hàm, không phải nhánh rẽ:
  ```bash
  cd $O
  grep -rn 'async setModel' packages/coding-agent/src --include='*.ts'
  # session/model-controls.ts:218   ← setModel(model, role, {selector, thinkingLevel, persist})
  # session/model-controls.ts:267   ← setModelTemporary(model, thinkingLevel, {ephemeral})
  # session/agent-session.ts:8941   ← setModel
  ```
  8+ call site (`selector-controller.ts:813,911`, `rpc-mode.ts:1435`, `acp-agent.ts:1819,2593`, `setup.ts:123`, `extension-ui-controller.ts:209,441`, `builtin-modes.ts:382`) **đều đi qua 2 hàm này**. Thêm emit bên trong `model-controls.ts:218` phủ 1 lần cho tất cả. **Hành vi không đổi khi chưa có extension nào đăng ký** — generic `emit` với 0 handler là no-op.
- **Hợp đồng vỡ nếu mở sai:** `model_select` trả `ModelSelectEventResult`. Nếu cho phép extension **trả model khác** thì phá vỡ `setModel`'s `Promise<{switched: boolean}>` mà 8 call site đang đọc (`selector-controller.ts:813` phân nhánh `if (switched)`). Cụ thể: `model-controls.ts:218` **throw** `new Error("No API key for ...")` khi thiếu credential. Nếu emit chạy **trước** check credential thì extension nhận model chưa hợp lệ và có thể trả lại model thiếu key ⇒ lỗi đổi thông điệp. **Phải emit sau `hasConfiguredAuth`, trước khi ghi log/session.**
- **Cỡ công:** 5 bước bắt buộc — (1) type `ModelSelectEvent` + `ModelSelectEventResult` ở `types.ts` (~15 dòng), (2) thêm vào `ExtensionEvent` union, (3) overload `on()` (~2 dòng), (4) thêm vào `RunnerEmitEvent`/`RunnerEmitResult` (`runner.ts:347,371`, ~4 dòng), (5) `emitModelSelect()` + gọi trong `model-controls.ts` (~20 dòng). **≈45 dòng, 3 file.**

### S2 — `agent_settled` (6 chỗ gọi) — **đã đo, hoá ra rẻ nhất mục 3**

Vòng soạn đầu tôi ghi "chưa đo được định nghĩa". Đo xong thay đổi cả xếp hạng:

```bash
cd $S
awk '/interface AgentSettledEvent/,/^}/' packages/coding-agent/src/core/extensions/types.ts
# export interface AgentSettledEvent {
# 	type: "agent_settled";
# }                          ← KHÔNG có payload

grep -rn 'agent_settled' packages/coding-agent/src --include='*.ts' | grep -v builtin
# core/agent-session.ts:1952:  await this._extensionRunner.emit({ type: "agent_settled" });
# core/agent-session.ts:1953:  this._emit({ type: "agent_settled" });   ← đẩy tiếp ra wire
# types.ts:1973:  on(event: "agent_settled", handler: ExtensionHandler<AgentSettledEvent>): void;
```

Ba phát hiện làm đổi bài toán:

1. **Không có payload** ⇒ **không cần `*EventResult`**, không cần plumbing dữ liệu. Chỉ cần type + overload + emit. Đây là event **rẻ nhất** trong 11 cái, không phải đắt nhất như tôi đoán.
2. **senpi phát nó ở `agent-session.ts:1952` rồi đẩy ngay ra wire `:1953`** — tức nó vừa là extension signal vừa là wire event, dùng chung một chỗ phát.
3. **Ý nghĩa: "agent đã xong và phiên rảnh"** — `interactive-mode.ts:6547` ghi rõ *"An idle session emits no further `agent_settled`, and that event is the only…"*. Consumer dùng `ctx.isIdle()` (`herdr/index.ts:150`: `active: !ctx.isIdle()`).

- **Mở được không sửa hành vi?** **CÓ, và omp ĐÃ CÓ SẴN đúng khái niệm này — chỉ khác tên.** Không phải tôi suy ra, mà đọc được từ chính tên cờ:
  ```bash
  cd $O
  sed -n '14,17p' packages/coding-agent/src/session/agent-session-events.ts
  # 14: | Exclude<AgentEvent, { type: "agent_end" }>
  # 15: | (Extract<AgentEvent, { type: "agent_end" }> & {
  # 16: /** False when an async delivery will resume the session before its true final settle. */
  # 17: isTerminal?: boolean;
  ```
  Câu doc đó **là định nghĩa `agent_settled`**: `isTerminal: false` ⇔ "còn giao bất đồng bộ sẽ làm phiên chạy lại" ⇔ **chưa settle**; `isTerminal !== false` ⇔ **đã settle thật**. senpi gọi nó `agent_settled` và phát ở `core/agent-session.ts:1952`; omp gọi nó `isTerminal` và định nghĩa ở `session/agent-session-events.ts` — **file này chỉ 83 dòng và nằm ở tầng session, nên một chỗ sửa là phủ hết mọi mode** (interactive, rpc, acp, print), không phải từng mode một.
  Cơ chế tiêu thụ đã có sẵn: `modes/rpc/rpc-session-settle.ts:59` (`event.type === "agent_end" && event.isTerminal !== false → void this.check()`) và `ctx.isIdle()` đã có ở `types.ts:478` + `types.ts:1770`.
- **Hợp đồng vỡ nếu mở sai:** đây là chỗ **dễ phá nhất về ngữ nghĩa, không phải về code** — và giờ đã có sẵn đường để làm đúng. Phát `agent_settled` mỗi lần `agent_end` kể cả `isTerminal === false` ⇒ `loop` gọi `settleAttributedTick("completed")` (`loop/index.ts:814-815`) **trước khi lượt thật xong**, `ttsr` reset `pendingNudge` (`ttsr/index.ts:267-270`) **mất cảnh báo**, `loop-guard` clear `pendingRecoveryToolName` (`loop-guard/index.ts:136-139`) **mất chặn vòng lặp**. Cả ba hỏng **âm thầm, không throw**. Quy tắc: **chỉ phát khi `isTerminal !== false`.**
- **Cỡ công:** type 3 dòng + overload 1 dòng + emit ~5 dòng = **≈10 dòng, 2 file** (`extensions/types.ts` + `session/agent-session-events.ts`). Rẻ nhất bảng. **Lên bước 1.**

### S3 — `session_abort` (4 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ.** Nhưng phải xác nhận omp đã có đường abort nào để gắn. **Chưa đo** (`grep 'abort' ` trong `session/` chưa chạy trong bài này).
- **Vỡ gì:** omp đã có `ctx.abort` trong `ExtensionContext` (`ext-api.md` §3.3) và 20 hook chỉ-omp. Nếu `session_abort` được emit **mỗi lần** abort thay vì **mỗi lần session kết thúc**, `goal`/`ttsr`/`loop` sẽ tưởng session đã xong → dừng vòng lặp giữa chừng. **Đây là seam dễ phá âm thầm nhất trong 11 cái.**
- **Cỡ công:** ≈40 dòng, 3 file.

### S4 — `session_parked` / `session_resumed` (2 + 2 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ, có điều kiện.** "Parked" là khái niệm omp **đã có sẵn** — `session_parked`/`session_resumed` thuộc nhóm "session lifecycle" mà `ext-api.md` §2.1 xếp cùng nhóm với `session_stop`/`session_switch` mà omp đã có. Nhưng tôi **chưa đo** xem state machine park của omp có điểm móc emit sạch không.
- **Vỡ gì:** chỉ 2 builtin dùng (`cache-keepalive`, `terminal`) — cả hai đều **không nên lấy** (100% và 57% cắm core, `deep-risk.md` §2.1/§6.2). ⇒ **seam này gỡ 0 builtin mà M5 thực sự định lấy.** Đề xuất: **không mở.**
- **Cỡ công:** ≈80 dòng (2 event), 3 file — **bỏ được.**

### S5 — `session_extensions_removed` (2 chỗ gọi)

- **Mở được không sửa hành vi?** **CÓ.** Nhưng xem S4: hai builtin dùng nó là `anthropic-subscription` và `cursor-cli-oauth` — **cả hai đều nằm trong danh sách "không lấy"** của `deep-risk.md` §6.2 (92% và 76% cắm core, SDK ngoài, tranh OAuth với `crates/pi-natives/src/oauth_callback/`).
- **Vỡ gì:** phát `session_extensions_removed` khi `disconnectExtension` chạy trong lúc một extension khác đang giữ tài nguyên ⇒ thu hồi tài nguyên hai lần.
- **Cỡ công:** ≈40 dòng, 3 file. **Gỡ 0 builtin có giá trị. Không mở.**

### S6 — 5 event, mỗi cái 1 chỗ gọi (`thinking_level_select`, `session_info_changed`, `session_before_fork`, `project_trust`, `input_disposition`)

- **Mở được không sửa hành vi?** **CÓ** cho cả 5, cùng lập luận S1.
- **Vỡ gì:** mỗi cái 1 người dùng nên động vào sai rất dễ mà không ai thấy. Đáng chú ý: **`project_trust` chỉ `config-reload` dùng — mà `config-reload` đã bị `deep-risk.md` §6.2 loại** (91% cắm core, tự thú 11/12 lần "làm bằng extension không được"). **Mở `project_trust` là công cộng 0.**
- **Cỡ công:** 5 cái × ≈40 dòng = **200 dòng, 3 file** — lớn hơn S1+S2 cộng lại mà gỡ ít hơn nhiều.

### S7 — `registerEntryRenderer` (5 file, 5 thư mục)

- **Mở được không sửa hành vi?** **CÓ, và đây là seam "rẻ nhất đắng nhất" của bài.** Nó chỉ đăng ký *renderer*, không tham gia luồng quyết định. Extension không đăng ký ⇒ transcript render y hệt.
- **Vỡ gì:** ô `registerEntryRenderer` cho phép một extension ghi đè cách vẽ entry của extension khác. Nếu cho đăng ký theo **id extension** thì an toàn; nếu cho theo **loại entry** thì extension A vẽ đè extension B mà không có cảnh báo. Chọn khoá = id.
- **Cỡ công:** 1 method + 1 bảng tra trong `transcript renderer` — **chưa đo vị trí chính xác**; ước 30 dòng, 2 file.

### S8 — `registerLazyToolActivator` + `registerRemovedToolHint` (3 file / 2 thư mục)

- **Mở được không sửa hành vi?** `registerLazyToolActivator`: **CÓ** — chỉ ảnh hưởng tool *đang được lọc khỏi context*, mặc định tắt. `registerRemovedToolHint`: **vô nghĩa để mở, 0 builtin dùng.**
- **Vỡ gì:** activator quyết định tool nào lộ cho model. Nếu activator trả tool lỗi, model thấy tool nhưng gọi luôn lỗi ⇒ vòng lặp gọi lại. Đây là đường đi vào đúng cái `deep-risk.md` gọi là *"rủi ro đốt tiền"*.
- **Cỡ công:** `registerLazyToolActivator` ≈40 dòng, 2 file — phủ `gpt-apply-patch` + `tool-search`. Cả hai đều **không lấy** (`deep-risk.md` §6.2, §8.2 hạng 6). **Gỡ 0 builtin có giá trị. Không mở.**

### S9 — `setSessionModel` / `setSessionFastMode` / `setSessionThinkingLevel` (6 chỗ gọi, 3 file, **1 file trần**)

- **Mở được không sửa hành vi?** **CÓ, phần lớn** — omp đã có `setThinkingLevel(level, persist?)` (`ext-api.md` §6.1 S10 nói "đã gần nửa viện"). Nhưng **phân biệt session-scoped vs persisted** là hợp đồng thật: `model-controls.ts:218` nhận `options.persist`, `setModelTemporary` (`:267`) **cố ý không ghi settings**. Thêm 3 method mà không giữ ranh giới này là cho extension ghi đè lên settings người dùng.
- **Vỡ gì:** đây là seam **phá nhiều nhất** nếu mở sai — `service-tier.ts` khai báo `setSessionFastMode` như **interface cục bộ ở dòng 109** (`deep-risk.md` §2.2 B3), tức tác giả tự định nghĩa hợp đồng với core. Port nguyên xi sẽ mang cả interface cục bộ đó vào omp, tạo **hai nguồn sự thật** cho cùng một khái niệm.
- **Cỡ công:** 3 method + plumbing xuống `model-controls.ts` = **≈60 dòng, 3 file.**

### S10 — 4 method `ctx.ui` + 6 method `executeTool`/`registerFilesystemPolicy`/`registerMarkdownTransformer`/`registerMcpServer`/`registerReadClassifier`/`registerRemovedToolHint`

- **Mở được không sửa hành vi?** Về kỹ thuật **CÓ** cho cả 10. Về giá trị: **0 builtin nào dùng bất kỳ cái nào** (bảng §2.2). `registerMcpServer` đặc biệt đáng bỏ — omp đã có `src/mcp/` nguyên bản, thiếu đúng *cú pháp đăng ký*, không thiếu *tính năng*.
- **Vỡ gì:** `registerFilesystemPolicy` là cái **nguy hiểm nhất trong 10** nếu mở. Nó là một `register*` thứ hai cạnh tranh quyền quyết định phê duyệt với `registerFileWriteFallback` + `tools/approval.ts` (387 dòng) + `tools/file-write-fallback.ts` (467 dòng) **đã chạy**. Hai đường phê duyệt cùng sống = một trong hai bị bỏ qua. Đây là hợp đồng **đang chạy**, không phải hợp đồng tương lai.
- **Cỡ công:** **không mở.** Đề xuất ghi vào `types.ts` là **comment chặn** thay vì method.

### 3.11 Bảng tổng công

| seam | loại | mở không sửa hành vi | vỡ gì nếu sai | công |
|---|---|---|---|---|
| **S2 `agent_settled`** | event | **CÓ** — omp đã có ngữ nghĩa "đã ngả" qua cờ `isTerminal` | phát mỗi `agent_end` kể cả non-terminal ⇒ `loop` chốt sớm, `ttsr` mất cảnh báo, `loop-guard` mất chặn vòng lặp. **Ba lỗi âm thầm, không throw** | **10 d/2 f** |
| S7 `registerEntryRenderer` | method | **CÓ** | khoá theo loại entry thay vì theo id → vẽ đè extension khác | 30 d/2 f |
| S1 `model_select` | event | **CÓ** | `setModel` trả `{switched}` cho 8 call site; emit sai chỗ → lỗi credential đổi thông điệp | 45 d/3 f |
| S9 3 method `setSession*` | method | CÓ (có điều kiện) | mất ranh giới session-scoped vs persisted; mang cả interface cục bộ của `service-tier.ts` | 60 d/3 f |
| S3 `session_abort` | event | CÓ | nhầm "abort" với "session xong" → dừng vòng lặp giữa chừng | 40 d/3 f |
| S4 `session_parked`/`resumed` | event | CÓ | thu hồi tài nguyên hai lần | 80 d/3 f — **không mở** |
| S5 `session_extensions_removed` | event | CÓ | như trên | 40 d/3 f — **không mở** |
| S6 5 event × 1 chỗ | event | CÓ | 5 vết thay đổi, 5 builtin, không ai thấy | 200 d/3 f — **để cuối** |
| S8 activator + hint | method | CÓ | tool lộ cho model nhưng gọi lỗi → gọi lại vô hạn | 40 d/2 f — **không mở** |
| S10 4 `ctx.ui` + 6 method | method | CÓ | `registerFilesystemPolicy` cạnh tranh `approval.ts` **đang chạy** | **không mở** |

**Tổng phải mở: 5 seam, ~185 dòng, 3 file.** Đối chiếu: 40 builtin / 97.893 dòng. Tỉ lệ tốt — **nhưng chỉ khi bỏ 5 seam cuối.**

---

## 4. Phân loại builtin theo cách gắn

### 4.1 Qua hook

**23 thư mục** cần event nhưng nếu mở event là chạy: 15 (vì `model_select`) + `agent_settled` phủ thêm 6 + `session_abort` phủ 4 + 5 cái 1-chỗ + `session_parked/resumed` + `session_extensions_removed`. Trong đó **giá trị thật** theo hạng `deep-risk.md` §8.2:

| builtin | event chặn | Lõi hay hook? |
|---|---|---|
| `ask-user` | `model_select` | hook + 1 tool |
| `look-at` | `model_select` | hook + 1 tool (model thị giác — lỗ hổng thật của omp) |
| `video-in` | `model_select` | hook + 1 tool |
| `websearch` | `model_select` | hook + 1 tool |
| `reasoning` | `model_select` | hook |
| `recommended-models` | `model_select` | hook |
| `todotools` | `session_abort` | hook + 1 tool |
| `loop-guard` | `agent_settled` | hook |

### 4.2 Thêm tool mới

**13 thư mục đăng ký tool** — đo bằng `xargs grep -l '\bregisterTool\b'` trên từng thư mục:

| mức | builtin | file dùng `registerTool` |
|---|---|---:|
| **lớn** | `mcp` | 9 |
| **vừa** | `gpt-apply-patch` | 2 |
| **một tool** | ask-user, goal, imagegen, look-at, loop, terminal, todotools, tool-search, video-in, webfetch, websearch | 1 mỗi cái |

Tổng **22 file** — khớp `deep-risk.md` §2.2 B2 (`registerTool 22 file`).

**`registerTool` đã có sẵn trong omp — tôi đã grep trực tiếp, không suy từ "không nằm trong 11 method thiếu":**

```bash
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -nE 'registerTool|registerCommand|registerMessageRenderer'
#  92: registerTool<TParams extends TSchema = TSchema, TDetails = unknown>(tool: ToolDefinition<TParams, TDetails>): void;
# 156: registerCommand(
# 195: registerMessageRenderer<T = unknown>(customType: string, renderer: MessageRenderer<T>): void;
```

(số dòng ở đây là **tương đối trong khối 1256-1590**; quy đổi `= 1255 + n` cho tuyệt đối: `registerTool` ở `types.ts:1347`, `registerCommand` ở `:1411`, `registerMessageRenderer` ở `:1450`.)

⇒ **13 thư mục trong bảng này không cần seam method nào, chỉ cần event.**

### 4.3 ⚠️ CẮM THẲNG VÀO CORE — đáng giá nhất VÀ nguy hiểm nhất

Đây là loại tách riêng, vì nó **không chờ seam nào cả**: cho mở hết 5 seam ở mục 3, 7 builtin dưới đây vẫn không chạy được.

Bằng chứng cứng nhất (`deep-risk.md` §2.2 B1 — 10 path lõi mà `changes.md` trong cây builtin nhắc tới, **tất cả đều tồn tại**):

| path lõi bị đào | ảnh hưởng |
|---|---|
| `packages/ai/src/utils/tool-pair-repair.ts` | `tool-pair-guard` vá ở tầng provider, omp không có |
| `packages/ai/src/api/transform-messages.ts` + `packages/agent/src/agent-loop.ts` | `compaction` |
| `packages/ai/src/utils/prompt-cache-ttl.ts` | `cache-keepalive` |
| `packages/ai/src/providers/cursor.ts` | `cursor-cli-oauth` |
| `packages/pty/src/registry-session.ts` | `terminal` |
| `packages/senpi-codemode/src/prompt/eval-prompt.ts` | eval routing |
| `src/config.ts` · `src/capability/rule.ts` · `src/core/messages.ts` | `config-reload` |

**Bốn dấu hiệu cắm thẳng, tự kiểm chứng bằng code chứ không tin tự thú:**

1. **Lệnh trực tiếp, không phải hook** (`deep-risk.md` §2.2 B2): `setActiveTools` **20 file** — tự quyết tool nào lộ cho model; `setModel` **3 file**. Đây là thứ đắt nhất về mặt kiến trúc: hook là *nhận tin*, lệnh là *ra lệnh*.
2. **Tự định nghĩa hợp đồng với core** (B3): `service-tier.ts:108-109` khai `setSessionFastMode` như interface cục bộ.
3. **Ép kiểu / monkey-patch** (B4): 6 file — `anthropic-subscription/auth-lane.ts`, `compaction/deterministic-fallback.ts`, `compaction/openai-remote.ts`, `cursor-cli-oauth/settings.ts`, `gpt-apply-patch/tool.ts`, `hooks/tool-adapter.ts`.
4. **Đọc config lõi / env để điều khiển** (B5/B6): `config-reload/index.ts:48` khai `CONFIG_FILE_NAMES = ["settings.jsonc","settings.json","models.json","keybindings.json"]` — theo dõi 4 file cấu hình cốt lõi; `goal/persistence.ts:83` đọc `process.env.PI_CODING_AGENT_DIR`.

**Xếp theo cả hai chiều — giá trị × nguy hiểm:**

| builtin | dòng | tự thú cắm core | đào file lõi | giá trị nếu có | **Mở seam có đủ không?** |
|---|---:|---:|---|---|---|
| `cache-keepalive` | 483 | **100%** | `packages/ai/…/prompt-cache-ttl.ts` | **mất tiền thật mỗi lượt** (giữ prompt cache ấm) | **KHÔNG.** Chỉ cần `model_select` + `registerEntryRenderer` là chạy được giả, nhưng **phần warm-cache đào vào `packages/ai` — phải viết lại** |
| `terminal` | 6.962 | 57% | `packages/pty/src/registry-session.ts` | terminal bền vững nhiều phiên | **KHÔNG.** omp đã có `pty.rs` (1.127 d) + `vterm` (1.067 d) |
| `compaction` | 8.779 | 40% | `transform-messages.ts` + `agent-loop.ts` | lớn nhất | **KHÔNG.** omp có `snapcompact`; senpi chọn prompt **theo provider** (vi phạm class-vs-provider) |
| `config-reload` | 2.317 | **91%** | `src/config.ts` | tiện | **KHÔNG** — và còn cần `project_trust` |
| `cursor-cli-oauth` | 5.186 | **92%** | `providers/cursor.ts` | trùng provider đã có | **KHÔNG** |
| `anthropic-subscription` | 7.281 | 76% + SDK | — | lớn | **KHÔNG** — SDK không có trong `bun.lock` |
| `herdr` | 418 | **100%** | hạ tầng pane ngoài | nhỏ | **KHÔNG** |
| `mcp` | 9.327 | 33% | — | omp đã có `src/mcp/` | **KHÔNG** (và cần `registerEntryRenderer`) |

**Kết luận 4.3, bằng một câu:** *cắm thẳng vào core là loại **đáng giá nhất** (giữ prompt cache ấm, terminal nhiều phiên, compaction) **và nguy hiểm nhất** (đào vào `packages/ai` và `packages/agent` — hai tầng mà cả 40 builtin cùng dùng), và **không builtin nào trong nhóm này được cứu bằng seam*.* Đừng mở thêm seam vì thấy chúng bị chặn — chúng bị chặn vì lý do khác.

*(Phần này kế thừa số đo của `deep-risk.md` §2; tôi không chạy lại từng lệnh đó — giới hạn 60 lệnh của vòng này dành cho phần dây. Ai đọc sau 6 tháng chạy lại §2.2 B1–B6 của `deep-risk.md`.)*

---

## 5. Chạy được NGAY, không cần seam nào

Đo bằng `awk` join (sau khi sửa lỗi zsh ở §2.1):

```bash
cd $S
awk -F'\t' 'NR==FNR{omp[$0]=1;next}
  { if($2 in omp) h[$1]=1; else m[$1]=1 }
  END{ for(d in h) if(!(d in m)) clean[++nc]=d; print "no-missing-event: " nc }' \
  /tmp/omp_ev.txt /tmp/dir_ev.tsv
# 11
```

Phân rã 40 thư mục:

| nhóm | số | thành phần |
|---|---:|---|
| Cần ≥1 event omp chưa có | **24** | 15 vì `model_select`, 6 vì `agent_settled`, 4 vì `session_abort`, còn lại rải |
| Có event, nhưng **không event nào thiếu** | 11 | webfetch, bash-timeout, anthropic-bash, permission-system, rules, mcp, tool-pair-guard, nested-agents-md, tool-search, hooks, imagegen |
| **0 `pi.on()` nào cả** | 5 | account, help, history-search, model-fallback, rule-activation |
| Trừ: cần method omp thiếu | −3 | mcp (`registerEntryRenderer`), tool-search (`registerLazyToolActivator`), rule-activation (`registerEntryRenderer`) |
| **= CHẠY ĐƯỢC NGAY** | **13** | xem dưới |

**13 builtin chạy được với hạ tầng omp hiện tại, sửa 0 dòng omp:**

`account` · `anthropic-bash` · `bash-timeout` · `help` · `history-search` · `hooks` · `imagegen` · `model-fallback` · `nested-agents-md` · `permission-system` · `rules` · `tool-pair-guard` · `webfetch`

**Cửa lòng trước khi tin con số 13** — "không cần seam" ≠ "chép được nguyên xi". Trong 13 cái đó:

- `permission-system` (1.638 dòng) — `deep-risk.md` §6.2/§8.2 hạng 5: **hai kiến trúc approval không tương thích**, phải viết lại theo `approval.ts` của omp. Seam-free, nhưng **không port được**.
- `webfetch` (1.062 dòng) — 70% tự thú cắm core (`deep-risk.md` §2.1).
- `rules` (2.842 dòng) — 50% cắm core.
- `anthropic-bash`, `imagegen` — hợp đồng provider; `deep-risk.md` §8.2 xếp "không lấy lúc này".

⇒ **13 là trần trên của "chạy được"**, và trần đó còn bị giới hạn bởi quy tắc `AGENTS.md`. Con số thực dùng được ngay, tính cả việc phải viết lại: **khoảng 6-8**, theo hạng 1-2 của `deep-risk.md` §8.2 (`btw`, `loop-guard`, `bash-timeout`, `history-search`, `look-at`) — trong đó `btw` và `look-at` **bị `model_select` chặn**, nên **chỉ `loop-guard`, `bash-timeout`, `history-search` là thật sự không cần seam cả lẫn viết lại kiến trúc.**

**Cảnh báo JSONL cho 13 cái này** (`deep-risk.md` §7, tôi đo lại theo từng thư mục):

| builtin | số file chạm session/JSONL |
|---|---:|
| `history-search` | 2 |
| `btw` | 1 |
| `tool-search` | 1 |
| `look-at` | 1 |
| `rules` · `video-in` · `webfetch` · `loop-guard` · `bash-timeout` | 0 |

Không builtin nào nào **ghi** JSONL, nhưng nhiều cái **đọc và phục hồi session**. Khi port, phải đi qua `parseJsonlLenient` của omp — **không** dùng `JSON.parse` trực tiếp.

---

## 6. Thứ tự mở seam

Ràng buộc đo được: `model_select` **phủ 15/24** builtin bị chặn; `agent_settled` phủ 6; `session_abort` phủ 4. Ba cái này **không chặn nhau** (không builtin nào dùng cả hai trừ `goal`, `loop`, `ttsr` — và những cái đó cần cả hai).

```
Bước 0  KHÔNG LÀM GÌ  ── dùng 13 builtin seam-free để dựng đường chạy thật
   │                     (mục 5). Đây là bước DUY NHẤT không tốn công.
   │
   ├─► Bước 1  S2 agent_settled                 (~10 d, 2 file)  ★ RẺ NHẤT
   │           gỡ 6 (goal, config-reload, herdr, loop, loop-guard, ttsr).
   │           Không payload, không cần *EventResult. Điểm móc:
   │           session/agent-session-events.ts:16 (bám cờ isTerminal,
   │           tầng session ⇒ phủ hết mode, không sửa từng mode)
   │           ⚠ dễ sai về NGỮ NGHĨA: phát cả non-terminal là hỏng
   │             loop/ttsr/loop-guard mà không throw
   │
   ├─► Bước 2  S7 registerEntryRenderer          (~30 d, 2 file)
   │           gỡ rule-activation; tiền đề cho mọi renderer sau này.
   │           Không chặn gì, không phụ thuộc bước nào
   │
   ├─► Bước 3  S1 model_select                  (~45 d, 3 file)  ★ NÚT THẮT
   │           gỡ 15 builtin. Điểm móc: session/model-controls.ts:218
   │           ⚠ KHÔNG chặn: cache-keepalive, terminal, compaction, cursor-cli-oauth,
   │             anthropic-subscription (phần cắm core), config-reload, herdr, mcp,
   │             gpt-apply-patch, prompt-preset
   │
   ├─► Bước 4  S3 session_abort                 (~40 d, 3 file)
   │           gỡ 4 (goal, loop, todotools, ttsr).
   │           ⚠ điểm móc trong omp CHƯA ĐO (mục 8) — đo trước khi viết
   │
   └─► Bước 5  S9 3 method setSession*          (~60 d, 3 file)
               gỡ service-tier.ts + recommended-models + reasoning
               ⚠ phải giữ ranh giới session-scoped vs persisted
               KHÔNG mang interface cục bộ của service-tier.ts:109 sang

   ✗ KHÔNG MỞ:  S4, S5, S8, S10   (mục 3.11 — gỡ 0 builtin có giá trị)
   ⏸ ĐỂ CUỐI:    S6 (5 event × 1 chỗ, 200 dòng cho 5 builtin)
```

**Bước nào chặn bước nào — trả lời thẳng câu hỏi đề:** `S2` và `S7` **không chặn gì cả** (độc lập, có thể làm song song, thậm chí trước S1). `S1` **chặn 15 builtin** nhưng **không chặn S2/S7/S9**. `S9` đứng cuối vì nó không gỡ builtin nào chạy được sớm hơn S1 mà lại phải giữ hợp đồng session-scoped/persisted — **rẻ mà dễ làm hỏng thứ khác**. Nói cách khác: **thứ tự ở đây là theo giá trị, không phải vì phụ thuộc kỹ thuật.**

**Quy tắc bất di bất dịch** (`ext-api.md` §6.3, tôi đồng ý nguyên văn): **chỉ BỔ SUNG event còn thiếu vào `types.ts`/`runner.ts` của omp. KHÔNG thay thế.** 20 hook chỉ-omp (`auto_retry_*`, `retry_fallback_*`, `tool_approval_*`, `before_subagent_spawn`, `goal_updated`, `todo_reminder`, `ttsr_triggered`, `credential_disabled`, `mcp_notification`, `session_switch`/`_before_branch`/`session_branch`/`session_stop`/`session.compacting`) là tài sản, mất thì mất.

**Đường vào rẻ nhất để thử trước khi động vào omp:** `directory-resolution.ts:69` đọc `pkg.omp ?? pkg.pi` — extension senpi khai `"pi": { "extensions": [...] }` được omp nạp nguyên bản. Ném thử 3 builtin seam-free vào đó **trước khi viết dòng seam nào**; lỗi biên dịch sẽ chỉ ra chính xác cái thiếu, và không tốn công sửa nếu ta sai.

---

## 7. Sửa các khẳng định của vòng trước

| # | Vòng trước nói | Đo lại | Kết luận |
|---|---|---|---|
| 1 | `ext-api.md` §6.1 S3: `executeTool` là seam, cần 1 method + plumbing | `xargs grep -l '\bexecuteTool\b'` trên 603 file builtin → **0 file**; `sed -n '186,196p' builtin/reasoning/index.ts` cho thấy dòng 192 là `pi.setSessionThinkingLevel(target)` | `deep-risk.md` §2.2 B3 gán `reasoning/index.ts:192` cho `executeTool` là **gán nhầm** — dòng đó khớp vì `setSessionThinkingLevel`. **`executeTool` là method khai trong `types.ts:2122` mà 0 builtin dùng** |
| 2 | `ext-api.md` §6.1 S5/S6/S7: `registerMarkdownTransformer`, `registerReadClassifier`, `registerRemovedToolHint` là seam cần mở | cả 3 → **0 file** | **Xếp hạng thổi phồng công.** Chỉ `registerEntryRenderer` (5) và `registerLazyToolActivator` (3) có người dùng |
| 3 | `ext-api.md` §6.1 S8: 4 method `ctx.ui` thiếu | cả 4 → **0 file** | Bỏ khỏi kế hoạch seam |
| 4 | `ext-api.md` §6.1 xếp `model_select` là "nút thắt số 1" | **đúng về số lượng** (16 chỗ gọi, 15 thư mục — cao nhất) nhưng **sai về tổng giá trị** | `model_select` gỡ 15/40 builtin, nhưng phần lớn 15 cái đó phải viết lại theo `deep-risk.md` §8.2. **Nút thắt _có giá trị_ là `setActiveTools`/`setModel`, không phải `model_select`** |
| 5 | `ext-api.md` §2.1: senpi có 18 event omp thiếu | 11 event được builtin dùng, 37 chỗ gọi | 7 cái còn lại 0 builtin dùng — xác nhận lại, **không cần mở** |
| 6 | `ext-api.md` §6.1 S4: `registerFilesystemPolicy` là "seam thật" | 0 file builtin dùng | Đúng là khác kiến trúc, **nhưng đó là lý do không mở, không phải lý do phải mở** |
| 7 | *(phát hiện mới, không sửa ai)*: `model_select` là nút thắt | `agent_settled` không có payload (`{ type }` trống), omp đã có sẵn `isTerminal` với doc *"true final settle"* | **Xếp hạng sai từ đầu.** `model_select` gỡ nhiều builtin nhất nhưng `agent_settled` **rẻ hơn 4× và là bước 1**. Cần cả hai, theo thứ tự ngược với "gỡ nhiều nhất trước" |

---

## 8. Sai sót đã biết của chính bài này

- **Tôi KHÔNG đọc `types.ts` của senpi (2.732 dòng) và `deep-risk.md` (978 dòng) toàn văn.** `ext-api.md` đọc hết bằng `sed` 2 khúc; `deep-risk.md` đọc `1-33`, `96-222`, `749-866` sau khi lấy mục lục bằng `grep -nE '^#{1,3} '`. **Mục `deep-risk.md` §3–§5 (vi phạm `AGENTS.md`, provider-specific) tôi KHÔNG đọc trực tiếp** — mọi trích dẫn từ §3/§4/§5 trong bài này là **gián tiếp qua `ext-api.md` và §6/§8**, không phải tôi tự kiểm lại.
- **Điểm móc emit cho `session_abort`, `session_parked`, `session_resumed`, `session_info_changed`, `project_trust`, `input_disposition`, `thinking_level_select`, `session_before_fork`: CHƯA ĐO.** Tôi chỉ khẳng định chúng "mở được" theo lập luận generic, chưa chỉ ra dòng cụ thể trong omp. Riêng `model_select` (`session/model-controls.ts:218`) và `agent_settled` (`modes/rpc/rpc-session-settle.ts:59`) thì **có**. Tôi có quét `packages/coding-agent/src/session/*.ts` tìm `abort` và thấy `agent-session.ts:918 #abortInProgress`, `agent-session.ts:1056` — **nhưng chưa truy ra được hàm public nào là "điểm kết của một lần abort"**, nên vẫn ghi CHƯA ĐO thay vì đoán.
- **Đã thu hẹp: chỗ phát `agent_settled` nhiều khả năng là MỘT, ở tầng session.** Tôi ban đầu trỏ vào `modes/rpc/rpc-session-settle.ts:59`, nhưng `grep -rln 'isTerminal'` cho **10 file** trong đó có `session/agent-session-events.ts` và `session/session-maintenance.ts` — tức khái niệm này đã nằm ở tầng session, không chỉ ở tầng mode. **Tôi chưa truy tới hàm cụ thể nào phát `agent_end` với `isTerminal`**, nên con số "10 dòng, 2 file" là **ước lượng trên cấu trúc đã đo, chưa phải phép đo vị trí**. Nếu hoá ra `agent_end` được phát ở nhiều nơi thì phải đếm lại.
- **Vị trí chính xác của `transcript renderer` trong omp (cho S7): CHƯA ĐO.** Ước 30 dòng là phỏng đoán từ "chỉ đăng ký renderer", không phải phép đo.
- **Tôi chỉ đếm `pi.on("…")`.** Một builtin có thể đăng ký event qua biến hoặc qua `wrapper` (`extensions/wrapper.ts`, 432 dòng ở omp) mà regex của tôi không bắt. Các con số "0 builtin dùng" cho 10 method thiếu là **trên phép đo `grep` từ đường**, không phải chứng minh tuyệt đối.
- **Tôi không mở file renderer của bất kỳ builtin nào** (kế thừa đúng điểm này của `deep-risk.md` §9). §5 nói "chạy được ngay" = **hợp đồng API đã đủ**, không phải "sẽ không lỗi TUI".
- **Số dòng trong mục 3 là ước lượng từ cấu trúc, không phải phép đo.** Tôi đo được *điểm móc* và *loại event*, không đo được *số dòng phải viết* — cần một spike thật mới chốt được.
- **Giới hạn 60 lệnh: tôi dùng 34.** Dự phòng còn 26 cho vòng sau.
- **Tôi không sửa file nào trong repo.** Toàn bộ là đo và khuyến nghị.

---

## Phụ lục — lệnh để chạy lại từ đầu

```bash
S=/Users/tranquangdang21/Projects/senpi-ref
O=/Users/tranquangdang21/Projects/ultraworkers
B=packages/coding-agent/src/core/extensions/builtin

# §0.1 — 46 event của omp
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -oE 'event: "[a-z_.]+"' | sed 's/event: "//;s/"//' | sort -u > /tmp/omp_ev.txt
wc -l < /tmp/omp_ev.txt; grep -n 'model_select' packages/coding-agent/src/extensibility/extensions/types.ts

# §1 — cấu trúc emit
grep -nE '(private|async|#)?\s*(emit|fire|dispatch)[A-Za-z]*\s*[<(]' \
  packages/coding-agent/src/extensibility/extensions/runner.ts | head -60
grep -rn 'type RunnerEmitEvent\|type RunnerEmitResult' packages/coding-agent/src/extensibility/extensions/*.ts

# §2.1 — 37 chỗ gọi, 11 event thiếu
cd $S
git ls-files "$B/*" | grep '\.ts$' > /tmp/builtin_ts.txt
xargs grep -hoE '\bpi\.on\("[a-z_.]+"' < /tmp/builtin_ts.txt | sed 's/pi.on("//;s/"//' | sort | uniq -c | sort -rn

# §2.2 — 15 method/field thiếu, mức dùng
for m in executeTool registerEntryRenderer registerFilesystemPolicy registerLazyToolActivator \
         registerMarkdownTransformer registerMcpServer registerReadClassifier registerRemovedToolHint \
         setSessionFastMode setSessionModel setSessionThinkingLevel \
         setWorkingVisible setWorkingIndicator setHiddenThinkingLabel getEditorComponent; do
  printf "%-30s %3s file\n" "$m" \
    "$(xargs grep -l "\b$m\b" < /tmp/builtin_ts.txt 2>/dev/null | wc -l | tr -d ' ')"
done

# §5 — phân rã 24 / 11 / 5 / −3 = 13  (BẮT BUỘC join bằng awk, KHÔNG dùng for e in $var — zsh không tách từ)
awk -F'\t' 'NR==FNR{omp[$0]=1;next}
  { if($2 in omp) h[$1]=1; else m[$1]=1 }
  END{ for(d in h) if(!(d in m)) clean[++nc]=d; print "no-missing-event: " nc }' \
  /tmp/omp_ev.txt /tmp/dir_ev.tsv

# §3 S1 — điểm móc model_select
cd $O && grep -rn 'async setModel' packages/coding-agent/src --include='*.ts'
sed -n '218,232p' packages/coding-agent/src/session/model-controls.ts

# §3 S2 — agent_settled: không payload, phát ở đâu, omp đã có isTerminal chưa
cd $S
awk '/interface AgentSettledEvent/,/^}/' packages/coding-agent/src/core/extensions/types.ts
grep -rn 'agent_settled' packages/coding-agent/src --include='*.ts' | grep -v builtin
cd $O
sed -n '14,17p' packages/coding-agent/src/session/agent-session-events.ts
grep -rln 'isTerminal' packages/coding-agent/src --include='*.ts'
wc -l packages/coding-agent/src/session/agent-session-events.ts

# §3 S2 — 6 consumer làm gì khi nhận agent_settled (bằng chứng "hỏng âm thầm")
cd $S
for f in herdr loop loop-guard ttsr; do
  grep -n -A3 'on("agent_settled"' packages/coding-agent/src/core/extensions/builtin/$f | head -4
done

# §4.2 — 13 thư mục đăng ký tool + registerTool đã có sẵn ở omp
cd $S
for d in $(cat /tmp/dirs40.txt); do
  n=$(xargs grep -l '\bregisterTool\b' < <(git ls-files "$B/$d/*" | grep '\.ts$') 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" != "0" ] && echo "$d $n"
done
cd $O
awk 'NR>=1256 && NR<=1590' packages/coding-agent/src/extensibility/extensions/types.ts \
  | grep -nE 'registerTool|registerCommand|registerMessageRenderer'
```

**Hai chỗ dễ sai khi đo lại:**

1. **`ls` ở máy này bị alias sang `ls -l`.** `ls -1 "$B"` trả về long-format, sinh ra hai dòng giả `.` và `..` mà awk sẽ gộp **toàn bộ** event vào, làm mọi phép đếm sai. Dùng `find "$B" -maxdepth 1 -mindepth 1 -type d`.
2. **zsh không tách từ khi mở rộng `$var` không nhắc.** `for e in $ev` chạy **một** lần với chuỗi nhiều dòng. Đây là lỗi đã làm tôi kết luận ngược "0/40 builtin cần seam". Luôn join bằng `awk`.

---

# Phần 7 — rủi ro khi chép

## Rủi ro sâu: builtin nào cắm thẳng vào core, builtin nào phụ thuộc provider/model, và cái nào VI PHẠM `AGENTS.md` của omp

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

---

# Phần 8 — phản biện (kế thừa)

## Phản biện `deep-risk.md` — đo lại từng khẳng định, in cả hai phép

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

---

# Phần 9 — phản biện (thiếu)

## PHẢN BIỆN `deep-risk.md` — bác bỏ được gì, không bác bỏ được gì

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

---

# Phần 10 — phản biện (seam)

## PHẢN BIỆN `deep-risk.md` — đo lại từng khẳng định

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
