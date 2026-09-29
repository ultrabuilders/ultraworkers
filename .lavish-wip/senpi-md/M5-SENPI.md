# M5 — senpi: tài liệu tổng hợp

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
