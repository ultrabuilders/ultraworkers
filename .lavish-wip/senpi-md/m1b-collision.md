# M1B va chạm với senpi: nên chép 7 package từ `pi` hay từ `senpi`?

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
