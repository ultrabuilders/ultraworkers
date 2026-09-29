# Phiếu triển khai — W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage

Nguồn: `MILESTONE_1_EXECUTION_PLAN.md` mục `## W16. Hợp đồng conformance lưu trữ dùng chung cho mọi backend SessionStorage` (dòng 3227–3450).
Phiếu này KHÔNG sửa file kế hoạch. Mọi sai lệch ghi ở mục 7.

---

## 1. Cái gì thay đổi, quan sát được

Sau W16, một backend `SessionStorage` mới thêm vào `packages/coding-agent/src/session/` mà không khai báo đủ khả năng sẽ **làm đỏ `bun test`** thay vì lặng lẽ tồn tại; và lịch F1 late-atomic-rollback — hiện chỉ chạy trên `Map` — sẽ lần đầu chạy trên một `SqlSessionStorage` thật dựng từ `new SQL("sqlite::memory:")`, nên nhánh conflict của `writeFull` SQL (đọc lại `readFull` rồi nuốt một lần thay thế byte-giống-hệt) có test chạm tới lần đầu.

Không dòng `src/` nào đổi. Thuần test.

---

## 2. VIỆC 1 — Kiểm lại từng neo

HEAD thật lúc viết phiếu: `65cc6c1` trên `milestone-1` (`git log --oneline -1` → `65cc6c1 test(coding-agent): opt in explicitly where the suite is about parsing`).

### 2.1 Neo ĐÚNG — dùng nguyên số dòng trong plan

| Neo trong plan | Nội dung thật tại dòng đó | Kết luận |
| --- | --- | --- |
| `src/session/sql-session-storage.ts:262` | `export class SqlSessionStorage extends IndexedSessionStorage {` | ĐÚNG |
| `src/session/redis-session-storage.ts:109` | `export class RedisSessionStorage extends IndexedSessionStorage {` | ĐÚNG |
| `src/session/indexed-session-storage.ts:118` | `export class IndexedSessionStorage implements SessionStorage {` | ĐÚNG |
| `src/session/indexed-session-storage.ts:553-566` | `#failFrame(path, mtimeMs)` — 553 là dòng mở hàm, 566 là `}`; bên trong có `this.#restoreIndex(path, failed.previous)` | ĐÚNG |
| `src/session/sql-session-storage.ts:377-394` | `const result = ...` → `if (written) return;` → `const current = await this.readFull(path);` → `throw new SessionWriteConflictError(...)` | ĐÚNG |
| `src/session/sql-session-storage.ts:384-393` | đúng khối re-check: `const current = await this.readFull(path);` … `if (actualSize === expectedSize) return;` | ĐÚNG |
| `src/session/sql-session-storage.ts:358` | `if (!row) throw enoent(path);` trong `readSlices` | ĐÚNG |
| `src/session/redis-session-storage.ts:182-187` | `readSlices` trả `Promise.all([head, tail])` | ĐÚNG |
| `src/session/sql-session-storage.ts:427-432` | `await this.#client.transaction(async transaction => { ... })` bọc trọn `move` | ĐÚNG |
| `src/session/redis-session-storage.ts:261-267` | `} catch (err) { logger.warn("Redis session storage meta rename failed", {...}) }` | ĐÚNG |
| `test/session/indexed-late-atomic-rollback.test.ts:5-11` | đúng mô tả chế độ hỏng F1 (`#failFrame` phục hồi snapshot cũ, `statSync` mô tả body backend không còn giữ) | ĐÚNG |
| `test/session/indexed-late-atomic-rollback.test.ts:120-145` | đúng lịch settler: 121 `failWrites=1`, 122 `gateReadFull=true`, 127 `writeFullAttempted.promise`, 128 `readFullGated.promise`, 130 `confirmWrites`, 131 `releaseReadFull()`, 137 `statSync(...).size`, 138 `writeTextSync(path,"C\n",{expectedSize:bSize})` | ĐÚNG (đã lệch +1 vì file có 118 `describe` / 119 `it`) |
| `test/session/redis-session-storage.test.ts:1-16` | header: `Driven by a hand-rolled fake Redis client so the suite runs without a live server.` | ĐÚNG |
| `test/session/redis-session-storage.test.ts:37` | `function createFakeRedis(): FakeRedis {` | ĐÚNG |
| `test/session/session-manager-indexed-durability.test.ts:22` | `class FakeBackend implements SessionStorageBackend {` | ĐÚNG |
| `test/session/sql-session-storage.test.ts:281` | `it("readTextSlices returns byte windows from the head and tail", ...)` | ĐÚNG |
| `test/session/sql-session-storage-manager.test.ts:128` | `it("rejects a stale rewrite after another SQL storage appends", ...)` — dựng `new SQL("sqlite::memory:")` thật | ĐÚNG |
| `packages/coding-agent/CHANGELOG.md` | tồn tại, có `## [Unreleased]` ngay dòng 3 | ĐÚNG |

### 2.2 Neo SAI hoặc lệch — đã dò lại

| Neo trong plan | Plan nói | Thật | Dòng đúng |
| --- | --- | --- | --- |
| `git rev-parse --short HEAD` | `ecd516f` | `65cc6c1` | — (plan đã tự cảnh báo là STALE, nay đã trôi thêm) |
| `test/session/sql-session-storage.test.ts:51-60` | "seam đã được chứng minh" để copy | 51–60 là `const queries: string[] = [];` + `const wrapped: SqlSessionStorageClient = {` (dòng 51) tới `};` (dòng 60). Đây **đúng** là seam bọc client. Nhưng nó **chỉ quan sát query**, **không** có cổng tiêm lỗi hay đậu `readFull` — phần plan cần phải tự viết mới. | 51–60 giữ nguyên; cần thêm cổng |
| `src/session/sql-session-storage.ts:277-282` và `redis-session-storage.ts:116-120` | "cả hai delegate `super(backend)`" | 277–282 và 116–120 là **`static async create(...)`**, không phải constructor. `super(backend)` thật nằm ở `sql-session-storage.ts:267` (trong `constructor`) và `redis-session-storage.ts` **không** có `super(backend)` — `RedisSessionStorage.create` truyền `new RedisSessionStorageBackend(options)` trực tiếp, không có constructor riêng. | `sql:267`; redis: không có dòng `super` |
| "81 module helper chỉ-dùng-cho-test" | con số 81 | `git ls-files` cho **81** (đúng tại HEAD); `find` trên working tree cho **82** vì có thêm file chưa track `packages/coding-agent/test/collab/web-wire.types.ts` | — (81 là con số đúng cho cây đã commit) |
| "grep `readTextSlices` trả hit ở `memory-session-storage.test.ts` và `sql-session-storage.test.ts:281` nhưng **không** hit nào ở `redis-session-storage.test.ts`" | redis chưa từng test `readTextSlices` | **SAI.** `redis-session-storage.test.ts` có 8 hit: dòng 269, 283, và `it("readTextSlices returns byte windows from the head and tail")` ở **dòng 416** (mirror y hệt SQL), cộng `it("readTextSlices uses GETRANGE instead of GET")`. Ngoài ra còn hit ở `test/session-listing-cache.test.ts` (4 spy) và `test/session-manager-close-race.test.ts`. | `redis-session-storage.test.ts:416` và `:428` |
| "grep `readTextSlices test/` … không hit nào ở redis" (mục Đính chính, dòng plan) | | SAI, xem trên. Khe trống thật còn lại là **byte-EOF semantics**, không phải "chưa từng gọi". | |
| `src/session/redis-session-storage.ts:261-267` được dùng để nói "Redis nuốt lỗi migration meta-hash" | | ĐÚNG về mặt việc `move` bọc `try/catch` chỉ `logger.warn`. Nhưng đây là method **`SessionStorageBackend.move`**, không phải API công khai. `SessionStorage` chỉ expose `rename` (`session-storage.ts:157`). Một group conformance gọi `storage.rename(...)` **không** chạm tới `RedisSessionStorageBackend.move` theo nghĩa atomic-rename mà plan mô tả. | |

### 2.3 Câu khẳng định đã kiểm chứng bằng chạy thật

Tôi đã chạy probe tạm (đã xoá sau khi chạy, không để lại file nào trong cây) để kiểm chứng các group claim thay vì tin bằng đọc:

- **`readTextSlices` trên path không tồn tại — plan nói SQL ném ENOENT, Redis trả `["",""]`. KHÔNG tái hiện được ở tầng `SessionStorage`.** Probe: cả SQL lẫn Redis đều `THREW: ENOENT: no such file, '/nope.jsonl'`. Lý do: `IndexedSessionStorage.readTextSlices` (`indexed-session-storage.ts:281-282`) kiểm tra `#index` **trước** và `if (!entry) throw enoent(path);` — backend `readSlices` không bao giờ được gọi. Chỉ khi index còn entry mà row backend đã mất (eviction/TTL) thì mới lộ: probe với Redis sau khi xoá key dưới index ấm trả `["",""]`. **Đây là khe hở thật, nhưng nhỏ hơn nhiều so với cái plan mô tả, và là lỗi âm thầm-mất-dữ-liệu chứ không phải "đường đọc sống".**
- **`casToken` với `{ expectedSize: null }` trên path đã tồn tại — đúng trên cả 4 backend đã thử** (file / memory / sql / map): đều `rejected(null/2)`. Không phải divergence.
- **Nhánh conflict SQL nuốt byte-giống-hệt — CÓ THẬT, đã quan sát.** `writeTextAtomic(path, "hello\n", { expectedSize: 6 })` khi row đang là `"hello\n"` trả **OK, bị nuốt thành công**; `writeTextAtomic(path, "HELLO\n", { expectedSize: 6 })` (cùng size, khác content) cũng **OK**; `expectedSize: 999` thì **THREW** đúng. Xác nhận `sql-session-storage.ts:384-393` là nhánh chưa có test nào chạm.
- **Lịch F1 chạy được trên SQL thật — CÓ, và tôi đã chạy thành công.** Seam đúng là bọc `client.unsafe` và phân biệt `readFull` bằng regex khớp chính xác câu query (`/^SELECT content AS content FROM omp_session_files WHERE path = \?$/` cho sqlite, `indexed-session-storage.ts` không can thiệp) — không dùng `includes("AS content")` vì còn `readSlices` cũng chứa `AS content`. Kết quả probe: backend content `=== B`, `statSync().size === 36 === bSize`, `writeTextSync(path,"C\n",{expectedSize:36})` không ném. **Lịch F1 pass trên SQL thật.**
- **`indexCoherence` — "hai lần ghi liên tiếp nhanh sinh `mtimeMs` tăng nghiêm ngặt" KHÔNG đúng trên `MemorySessionStorage`.** Probe đo thật: file `true`, indexed `true`, **memory `false`** (cả hai lần ghi ra cùng `mtimeMs: 1790641139654`). Nguyên nhân: `session-storage.ts:1154` `createMemoryFileEntry(content, Date.now())` — độ phân giải mili-giây, hai lần ghi trong cùng ms là bằng nhau. Chỉ `IndexedSessionStorage` có bộ đếm đơn điệu `#allocMtimeMs()` (`indexed-session-storage.ts:513-518`) cộng dồn `+1`. **Đây là divergence thứ ba mà plan không liệt kê, và nó sẽ đỏ ngay ở group `indexCoherence` nếu viết đúng như plan.**
- **`rename` để lại nguồn ENOENT — đúng trên file / memory / sql / map.** Redis không probe được bằng double tự viết vì `writeFull` của Redis đi qua `send("EVAL", [WRITE_FULL_SCRIPT, ...])`; double tối giản phải implement `send` với script dispatcher mới chạy được (double sẵn có ở `redis-session-storage.test.ts:71-109` làm đúng việc này).
- **Gate KHÔNG còn bị chặn.** `packages/natives/native/pi_natives.darwin-arm64.node` **đã tồn tại**. `bun test` chạy được: 4 file có sẵn → **52 pass / 0 fail / 181 expect**. `bun test test/session/indexed-late-atomic-rollback.test.ts` → **1 pass / 0 fail**. Plan (và bảng cổng ở dòng 4312) nói `bun test` bị chặn bởi "Failed to load pi_natives native addon" — **điều đó không còn đúng**.

---

## 3. Bảng điểm sửa

Không sửa file nào. Toàn bộ thay đổi là **tạo mới 3 file** + **sửa 1 dòng trong file kế hoạch là không** (không). Bảng dưới mô tả hình dạng sau khi viết, kèm văn bản thật đã trích từ file nguồn.

| đường/dẫn | symbol | TRƯỚC | SAU |
| --- | --- | --- | --- |
| `packages/coding-agent/test/session/storage-conformance.ts` | *(không tồn tại)* | `ls` → `no matches found` | Module thuần, **không** `describe`/`it`. Export `StorageHarness`, `ConformanceGroups` (8 key), `ConformancePlan`, `createStorageConformance(name, createHarness, groups)`. Trả `{ groups, skipped }`; `skipped` = key của `ALL_GROUPS` vắng mặt trong `groups`. |
| `packages/coding-agent/test/session/storage-conformance.test.ts` | *(không tồn tại)* | — | 5 khối `describe` + 2 test hợp đồng harness. |
| `packages/coding-agent/test/session/indexed-over-real-backend.test.ts` | *(không tồn tại)* | — | Vòng lặp tham số hoá 3 harness chạy `lateAtomicRollback` + `failureRecovery`, **kèm một test khẳng định danh sách harness dài ≥ 3**. |
| `src/session/session-storage.ts:1154` | `MemorySessionStorage.writeTextSync` | `this.#files.set(path, createMemoryFileEntry(content, Date.now()));` | **không đổi** — nhưng group `indexCoherence` **không được** khẳng định mtime tăng nghiêm ngặt trên memory. Xem mục 6. |
| `src/session/sql-session-storage.ts:384-393` | `SqlSessionStorageBackend.writeFull` conflict branch | `if (actualSize === expectedSize) return;` | **không đổi** — đây là hành vi cần test bảo vệ, không phải bug cần sửa. |

---

## 4. Các bước, mỗi bước có neo đã kiểm

### Bước 1 — Chốt lại ba neo, đã verify

```bash
git rev-parse --short HEAD            # thực tế: 65cc6c1 (KHÔNG phải ecd516f)
grep -n "extends IndexedSessionStorage" packages/coding-agent/src/session/*.ts
#   sql-session-storage.ts:262, redis-session-storage.ts:109   ← khớp plan
grep -n "confirmWrites\|withSessionFileLockSync\|deleteSessionWithArtifactsIf\|defersSyncPublish" \
  packages/coding-agent/src/session/session-storage.ts \
  packages/coding-agent/src/session/indexed-session-storage.ts
#   defersSyncPublish: session-storage.ts:121 (opt), indexed-session-storage.ts:123 (=true)
#   confirmWrites:    session-storage.ts:128 (opt), indexed-session-storage.ts:199
#   withSessionFileLockSync:   session-storage.ts:165 (opt), :861 (chỉ FileSessionStorage)
#   deleteSessionWithArtifactsIf: session-storage.ts:171 (opt), :869 (chỉ FileSessionStorage)
```

Kết luận bước 1: cả SQL và Redis **vẫn** `extends IndexedSessionStorage`. Các optional member **không** dời. Thiết kế còn hiệu lực.
Neo đã đọc: `sql-session-storage.ts:262`, `redis-session-storage.ts:109`, `session-storage.ts:121`, `session-storage.ts:128`, `indexed-session-storage.ts:123`, `indexed-session-storage.ts:199`.

### Bước 2 — `test/session/storage-conformance.ts`: cơ chế

Ba export. Hàm **không** tự gọi `describe`/`it` — đó là điều làm `skipped` khẳng định được ở bước 6.

```ts
import { IndexedSessionStorage } from "@oh-my-pi/pi-coding-agent/session/indexed-session-storage";
import type { SessionStorage } from "@oh-my-pi/pi-coding-agent/session/session-storage";

export interface StorageHarness {
	readonly storage: SessionStorage;
	/** Fail next N backend `writeFull` / `append` calls (transient-failure group). */
	failWrites(n: number): void;
	/** Park `readFull` until `releaseReadFull()` — required by the F1 late-rollback schedule. */
	gateReadFull(): void;
	releaseReadFull(): void;
	dispose(): Promise<void>;
}

export interface ConformanceGroups {
	readWrite(): void;
	indexCoherence(): void;
	casToken(): void;
	sliceReads(): void;
	deferredPublish(): void;
	crossProcessLock(): void;
	failureRecovery(): void;
	lateAtomicRollback(): void;
}

/** `Partial` IS the scope: an absent key is skipped, never failed. */
export interface ConformancePlan {
	readonly groups: Record<string, () => void>;
	readonly skipped: readonly string[];
}

export function createStorageConformance(
	name: string,
	createHarness: () => Promise<StorageHarness>,
	groups: Partial<ConformanceGroups>,
): ConformancePlan {
	const all: ConformanceGroups = { readWrite, indexCoherence, /* …8 nhóm… */ };
	const keys = Object.keys(all) as Array<keyof ConformanceGroups>;
	const kept = keys.filter(key => groups[key] !== undefined);
	return {
		groups: Object.fromEntries(kept.map(key => [key, () => groups[key]!()])),
		skipped: keys.filter(key => groups[key] === undefined),
	};
}
```

`once` đã có sẵn: `packages/utils/src/abortable.ts:99` `export function once<T>(fn: () => T): () => T`. Nhưng nó **không** cần dùng ở đây — `createHarness` được truyền vào group factory, không vào `ConformancePlan`. Bỏ `harness` khỏi body (bản code-shape trong plan giữ một biến `harness` không dùng — dead code).

Neo đã đọc: `packages/utils/src/abortable.ts:99`, `indexed-session-storage.ts:118`.

### Bước 3 — Tám group factory

| group | Hợp đồng phải khẳng định | Neo đã đọc |
| --- | --- | --- |
| `readWrite` | `writeTextSync` → `drain()` → `readText` round-trip đúng nguyên văn; `rename` di chuyển body, nguồn ENOENT; `unlink` xoá | `session-storage.ts:131,157,158`; đã probe: file/memory/sql/map đều `renameSourceGone: true` |
| `indexCoherence` | `existsSync`, `statSync().size` (byte UTF-8), `listFilesSync(dir,"*.jsonl")` khớp body. **KHÔNG** khẳng định mtime tăng nghiêm ngặt trên memory (xem bước 6 / mục 6) | `indexed-session-storage.ts:513-518` vs `session-storage.ts:1154` |
| `casToken` | `expectedSize` khớp → nhận; `expectedSize` cũ → `SessionWriteConflictError` mang đúng `path`/`expectedSize`/`actualSize`; `expectedSize: null` trên path tồn tại → từ chối | `session-storage.ts:57-60,66-78`; đã probe: cả 4 backend `rejected(null/2)` |
| `sliceReads` | `readTextSlices` đúng cửa sổ byte đầu/cuối, gồm `(0,0)` → `["",""]`, và yêu cầu vượt ngân sách → toàn bộ body | `session-storage.ts:146`; `memory-session-storage.test.ts:57` đã khẳng định `(0,0)` |
| `deferredPublish` | `defersSyncPublish === true`; `confirmWrites(path)` resolve sau khi backend publish, reject khi publish đã xếp hàng thất bại | `indexed-session-storage.ts:123,199` |
| `crossProcessLock` | `withSessionFileLockSync` serialize; `deleteSessionWithArtifactsIf` chỉ xoá khi predicate nhận nội dung **hiện tại** | `session-storage.ts:861,869` (chỉ `FileSessionStorage`) |
| `failureRecovery` | fail lần `writeFull`/`append` kế tiếp → index rollback về entry bền vững cuối, body đã fail không đọc được, lần ghi kế tiếp hội tụ rồi republish | `session-manager-indexed-durability.test.ts:22-97` (`FakeBackend` có `failAppends`/`failWrites`) |
| `lateAtomicRollback` | đúng lịch F1 | `indexed-late-atomic-rollback.test.ts:120-145` |

Neo: `packages/coding-agent/test/session/storage-conformance.ts` (file mới).

### Bước 4 — Năm harness factory

**`createSqlHarness`.** Bọc `new SQL("sqlite::memory:")` trong một `SqlSessionStorageClient` delegate `unsafe`/`transaction`. Seam gốc ở `test/session/sql-session-storage.test.ts:51-60` **chỉ quan sát query** — phần tiêm lỗi và đậu `readFull` phải viết mới:

```ts
const orig = client.unsafe.bind(client);
client.unsafe = async (q, v) => {
	// readFull là query DUY NHẤT khớp regex này ở sqlite. KHÔNG dùng
	// q.includes("AS content") — readSlices cũng chứa "AS content".
	if (/^SELECT content AS content FROM omp_session_files WHERE path = \?$/.test(q)) {
		if (gated) await gatePromise;
	}
	if (failNext > 0 && /^UPDATE .* WHERE path = \? AND length\(cast\(content AS blob\)\) = \?/s.test(q)) {
		failNext--;
		throw new Error("transient backend write failure");
	}
	return orig(q, v);
};
```

Tôi đã chạy đúng seam này và lịch F1 **pass** trên SQL thật (backend content `=== B`, `statSync().size === 36`, `writeTextSync` hậu kiểm không ném). `dispose`: `await client.end()`.

**`createRedisHarness`.** Tái dùng `createFakeRedis` ở `test/session/redis-session-storage.test.ts:37`. Bắt buộc phải giữ nguyên phần `send` dispatcher (`:71-109`) vì `RedisSessionStorageBackend.writeFull` gọi `this.#client.send("EVAL", [WRITE_FULL_SCRIPT, "3", ...])` (`redis-session-storage.ts:195-201`) chứ **không** gọi `set`. Một double chỉ có `set`/`get` sẽ hỏng âm thầm — tôi đã dính lỗi này khi probe. Hai điểm tiêm lỗi nối vào `checkFailure("send")` sẵn có.

**`createFileHarness`** — `new FileSessionStorage()`. Cả hai class là constructor **không tham số**; `FileSessionStorage` nhận **đường dẫn tuyệt đối** trong mỗi lời gọi, không nhận root. Dùng `mkdtempSync(join(tmpdir(), "…"))`.
**`createMemoryHarness`** — `new MemorySessionStorage()`.
**`createMapHarness`** — `new IndexedSessionStorage(new FakeBackend())`, `FakeBackend` ở `session-manager-indexed-durability.test.ts:22` (đã có đủ `init`/`loadIndex`/`readFull`/`readSlices`/`append`/`writeFull`/`updateSessionTitle`/`truncate`/`remove`/`move`).

**Không bao giờ** `mock.module()` — mutate object client được inject trong từng test rồi reset.

Neo đã đọc: `test/session/sql-session-storage.test.ts:51-60`, `test/session/redis-session-storage.test.ts:37` và `:71-109`, `redis-session-storage.ts:195-201`, `session-manager-indexed-durability.test.ts:22`.

### Bước 5 — `test/session/storage-conformance.test.ts`: đăng ký

5 khối `describe`:
- `SqlSessionStorage (real SQLite)` — 7 nhóm, bỏ `crossProcessLock`
- `RedisSessionStorage (double)` — 7 nhóm, bỏ `crossProcessLock`
- `IndexedSessionStorage (map control)` — 7 nhóm, bỏ `crossProcessLock`
- `MemorySessionStorage` — bỏ `deferredPublish` **và `crossProcessLock`**
- `FileSessionStorage` — bỏ `deferredPublish`, **giữ `crossProcessLock`**

Giới hạn theo năng lực, không theo tiện lợi: `defersSyncPublish`/`confirmWrites` chỉ có ở `IndexedSessionStorage` (`indexed-session-storage.ts:123,199`) — tôi đã grep và xác nhận `FileSessionStorage` và `MemorySessionStorage` **không** khai báo. `withSessionFileLockSync`/`deleteSessionWithArtifactsIf` chỉ có ở `FileSessionStorage` (`session-storage.ts:861,869`).

> **LƯU Ý SỐ NHÓM:** plan viết "`FileSessionStorage` báo đúng `skipped === ["deferredPublish"]`". Điều đó chỉ đúng **nếu** `FileSessionStorage` được cấp `crossProcessLock`. Nếu bạn cấp, `skipped` của nó là `["deferredPublish"]`; hãy khẳng định đúng giá trị bạn thật sự cấp, đừng copy thẳng chuỗi từ plan.

Neo: `packages/coding-agent/test/session/storage-conformance.test.ts` (file mới).

### Bước 6 — Hai test hợp đồng harness

```ts
it("reports an omitted group as skipped instead of failing it", () => {
	expect(sqlPlan.skipped).toEqual(["crossProcessLock"]);
	expect(filePlan.skipped).toEqual(["deferredPublish"]);
});

it("never runs a group the backend did not declare", () => {
	for (const [name, plan, declared] of REGISTRATIONS) {
		expect(Object.keys(plan.groups).sort()).toEqual(
			declared.filter(g => ALL_GROUP_NAMES.includes(g)).sort(),
		);
	}
});
```

Neo: `packages/coding-agent/test/session/storage-conformance.test.ts` (file mới).

### Bước 7 — `test/session/indexed-over-real-backend.test.ts`

Vòng lặp tham số hoá **duy nhất** trên `createSqlHarness` / `createRedisHarness` / `createMapHarness`, chạy `lateAtomicRollback` + `failureRecovery`.

**Bắt buộc:** để danh sách harness thành một hằng export và có một test riêng khẳng định nó ≥ 3 phần tử — nếu không, xoá nhánh SQL khỏi vòng lặp sẽ **không** làm đỏ gì cả.

```ts
export const HARNESSES = [
	["sql (real Bun.SQL sqlite)", createSqlHarness],
	["redis (double)", createRedisHarness],
	["map control", createMapHarness],
] as const;

it("covers every registered harness", () => {
	expect(HARNESSES.length).toBeGreaterThanOrEqual(3);
	expect(HARNESSES.map(([n]) => n)).toContain("sql (real Bun.SQL sqlite)");
});
```

Neo đã đọc: `test/session/indexed-late-atomic-rollback.test.ts:120-145` (lịch), `test/session/session-manager-indexed-durability.test.ts:22-97` (`FakeBackend` cho ma trận durability).

### Bước 8 — Xác minh

```bash
# Cổng — phải exit 0:
bun test packages/coding-agent/test/session/storage-conformance.test.ts \
         packages/coding-agent/test/session/indexed-over-real-backend.test.ts

# Không được phá 4 file có sẵn (baseline đã đo: 52 pass / 0 fail / 181 expect):
bun test packages/coding-agent/test/session/sql-session-storage.test.ts \
         packages/coding-agent/test/session/redis-session-storage.test.ts \
         packages/coding-agent/test/session/session-manager-indexed-durability.test.ts \
         packages/coding-agent/test/session/indexed-late-atomic-rollback.test.ts

# Không dùng tsc. Nếu muốn kiểm tra kiểu:
bun run check:ts
```

> **Không cần `brew install ninja` / `bun --cwd=packages/natives run build` nữa.** `packages/natives/native/pi_natives.darwin-arm64.node` đã tồn tại và `bun test` chạy được ngay. Plan (dòng 3399-3401 và bảng cổng dòng 4312) vẫn nói gate bị chặn — **điều đó đã lỗi thời**.

### Bước 9 — Báo cáo sai lệch thành phát hiện riêng

Đừng nới group để làm nó xanh. Ba divergence đã **quan sát được** (không phải suy đoán):

| # | Divergence | Backend nào sai | Loại |
| --- | --- | --- | --- |
| 1 | `writeFull` conflict nuốt lần thay thế byte-giống-hệt (`sql:393` `if (actualSize === expectedSize) return;`) | Không sai — đã có comment giải thích, là hợp đồng có chủ ý | **Cần test bảo vệ, không cần changelog** |
| 2 | `indexCoherence`: mtime không tăng nghiêm ngặt trên `MemorySessionStorage` (`session-storage.ts:1154` dùng `Date.now()`) | Memory (thiếu bộ đếm đơn điệu) | **Group đặt quá nhiều** — thu hẹp assertion, KHÔNG sửa `src/` |
| 3 | `readSlices` trên row đã mất: SQL ném ENOENT (`sql:358`), Redis trả `["",""]` (`redis:182-187`) | Redis (âm thầm mất dữ liệu) | **Bug thật** → fix + mục `packages/coding-agent/CHANGELOG.md` dưới `## [Unreleased]` |

Chỉ #3 là bug production. #1 và #2 không cần changelog.

---

## 5. Hợp đồng test

**File:** `test/session/storage-conformance.ts`, `test/session/storage-conformance.test.ts`, `test/session/indexed-over-real-backend.test.ts`.

**Các case:**

1. Mỗi backend × 7-8 nhóm: `readWrite`, `indexCoherence`, `casToken`, `sliceReads`, `deferredPublish`, `failureRecovery`, `lateAtomicRollback`; `crossProcessLock` chỉ trên `FileSessionStorage`.
2. `reports an omitted group as skipped instead of failing it` — so sánh mảng **tuyệt đối** trên `skipped`.
3. `never runs a group the backend did not declare` — chốt gá chống việc một backend âm thầm chạy sai tập nhóm.
4. `keeps B durable when A's gated readback settles after B commits` — lịch F1, chạy trên cả 3 harness thật.
5. `covers every registered harness` — danh sách harness ≥ 3 và có SQL.
6. `keeps the CAS token contract on a real SQL connection` — khẳng định nhánh `sql:384-393` nuốt byte-giống-hệt **và** ném khi size thật sự lệch.

**Điều người dùng thấy gì nếu hồi quy:**

- Hồi quy ở `#failFrame` (`indexed-session-storage.ts:553-566`) → một hội thoại session in-memory **mất khi đóng tiến trình**; mô tả đúng ở `test/session/indexed-late-atomic-rollback.test.ts:5-11`. Đây là hậu quả người dùng thấy, không phải "test đỏ".
- Hồi quy ở nhánh conflict SQL → người dùng **không** thấy gì (byte-giống-hệt bị nuốt là đúng ý đồ). Họ chỉ thấy test đỏ. Đây là hợp đồng bảo vệ hành vi, không phải hành vi người dùng quan sát.
- Hồi quy ở group `sliceReads` → `SessionManager` đọc cửa sổ byte sai ở đầu/cuối transcript, hiển thị context cũ hoặc rỗng trong TUI.
- Hồi quy ở `skipped` → suite vẫn xanh nhưng một nhóm **không còn chạy** nữa. Đây là hành vi tệ nhất và là lý do test #2 tồn tại.

---

## 6. Cổng — có đỏ được không?

### 6.1 Cổng chính

```bash
bun test packages/coding-agent/test/session/storage-conformance.test.ts \
         packages/coding-agent/test/session/indexed-over-real-backend.test.ts
```

**CÓ ĐỎ ĐƯỢC. Bằng ba đường đã kiểm chứng, không suy đoán:**

1. **Hai file không tồn tại** → `bun test` báo lỗi trên đường dẫn thiếu. Đã kiểm: `ls packages/coding-agent/test/session/storage-conformance*.ts` → `no matches found`.
2. **`skipped` là so sánh mảng tuyệt đối** → thêm/bớt/giới hạn sai một nhóm sẽ đỏ, không pass lặng lẽ.
3. **F1 là assertion hành vi** → `expect(backend content).toBe(bBody)` và `writeTextSync(..., { expectedSize: bSize })` không ném. Tôi đã **chạy** lịch này trên SQL thật và nó pass với giá trị cụ thể (`size 36 === bSize 36`) — nên nó là một assertion thật, không phải tautology.

**Vì sao nó KHÔNG phải cổng xanh giả (điểm mà plan cảnh báo):** cổng xanh giả ở đây là "xoá nhánh SQL khỏi vòng lặp nhưng `sqlPlan.skipped` vẫn pass". Đó là lý do `covers every registered harness` (bước 7) là **bắt buộc**, không tuỳ chọn — nó đọc giá trị cụ thể (`length >= 3` + `toContain("sql …")`), không phải `expect(true)`.

### 6.2 Cổng không thể đỏ — phải viết lại

**`bun run check:ts` KHÔNG phải là cổng cho W16.** Nó pass sạch khi file test **không tồn tại**, và cũng pass sạch khi mọi group sai. Type-check không thấy hành vi. Giữ nó làm **smoke bổ trợ**, đừng tính là cổng.

**Cổng "4 file có sẵn vẫn xanh" cũng yếu hơn vẻ ngoài.** Baseline đã đo: `52 pass / 0 fail / 181 expect`. Nó đỏ nếu bạn phá `src/` — nhưng W16 **không được** sửa `src/`, nên về mặt cấu trúc nó gần như luôn xanh. Nó là **regression guard**, không phải cổng nghiệm thu.

### 6.3 Điều plan nói về độ tin cậy — đã lỗi thời

Plan viết: *"`bun test` bị chặn trong môi trường này bởi native addon chưa build, nên nó được **lập luận từ mã nguồn**, không phải quan sát thấy pass."*

Điều đó **không còn đúng**. `packages/natives/native/pi_natives.darwin-arm64.node` đã tồn tại; tôi đã chạy `bun test` thật:
- `indexed-late-atomic-rollback.test.ts` → `1 pass / 0 fail / 3 expect`
- 4 file có sẵn → `52 pass / 0 fail / 181 expect`
- Probe F1 trên SQL thật → `1 pass / 0 fail`

Cổng của W16 có thể chạy quan sát được ngay. **Đừng ghi "gate bị chặn" trong báo cáo.**

---

## 7. Cạm bẫy riêng của work item này

1. **`indexCoherence` sẽ đỏ trên `MemorySessionStorage` nếu viết đúng như plan.** Plan bảo "hai lần ghi liên tiếp nhanh sinh `mtimeMs` tăng nghiêm ngặt". Đo thật: memory cho `m1 === m2 === 1790641139654`. Nguyên nhân `session-storage.ts:1154` `createMemoryFileEntry(content, Date.now())`. Chỉ `IndexedSessionStorage` có `#allocMtimeMs()` cộng dồn. **Đây là cái dễ làm sai nhất**, vì phản ứng tự nhiên là "nới group" — đúng thứ mục 4 của plan cấm. Sửa đúng: thu hẹp assertion mtime thành indexed-only, hoặc so sánh `>=` thay vì `>`.

2. **Đừng tin claim "Redis `readSlices` trả `["",""]` trên path không tồn tại" theo nghĩa plan nói.** Probe: cả hai đều ném ENOENT, vì `IndexedSessionStorage.readTextSlices` (`indexed-session-storage.ts:281-282`) chặn ở index trước. Chỉ lộ khi index còn entry mà row backend đã mất. Nếu bạn viết group theo mô tả plan, bạn sẽ viết một case **không bao giờ đỏ** — tệ hơn không viết.

3. **Redis double phải implement `send("EVAL", …)`, không phải `set`.** `RedisSessionStorageBackend.writeFull` gọi `this.#client.send("EVAL", [WRITE_FULL_SCRIPT, "3", …])` (`redis-session-storage.ts:195-201`). Một double "tự viết" chỉ có `get`/`set` sẽ hỏng — tôi đã dính đúng lỗi này khi probe (`TypeError: undefined is not an object (evaluating 'batch')` từ `loadIndex`, và `ENOENT: no such key 'omp:sessions:file:/r.jsonl'` khi rename). **Tái dùng `createFakeRedis` ở `redis-session-storage.test.ts:37`, đừng viết lại từ đầu.**

4. **Seam SQL phải phân biệt `readFull` bằng regex khớp TRÌNH, không `includes("AS content")`.** `readSlices` cũng chứa `AS content`. Probe đầu tiên của tôi dùng `includes` và hỏng. Câu query sqlite là `SELECT content AS content FROM omp_session_files WHERE path = ?` (`sql-session-storage.ts:169`). Seam đúng đã chạy và **pass**.

5. **`move` là API backend, không phải API công khai.** `SessionStorage` expose `rename` (`session-storage.ts:157`), không có `move`. Cả divergence `move()` mà plan liệt kê (Redis nuốt lỗi vs SQL transactional) chỉ quan sát được qua `SessionStorageBackend.move` — và `IndexedSessionStorage.rename` (`indexed-session-storage.ts:362-374`) **cập nhật index trước, enqueue backend move sau**, nên một group gọi `storage.rename()` không kiểm chứng tính nguyên tử của `move` mà plan mô tả. Đừng viết group "rename nguyên tử" rồi tưởng nó đang kiểm `sql:427-432`.

6. **Con số 81 vs 82.** `git ls-files` → 81 (đúng tại HEAD, khớp plan). `find` trên working tree → 82 vì có `packages/coding-agent/test/collab/web-wire.types.ts` chưa track. Nếu bạn chạy lại lệnh kiểm chứng của plan và thấy 82, đó **không** phải plan sai.

7. **`FileSessionStorage` và `MemorySessionStorage` là constructor không tham số.** Plan gợi ý chúng "trên `Bun.tempDir()`" — không có tham số root nào để truyền. `FileSessionStorage` nhận **đường dẫn tuyệt đối** ở từng lời gọi. Dùng `mkdtempSync(join(tmpdir(), …))` và truyền path tuyệt đối.

8. **Đừng dùng `mock.module()`.** Nó mutate global registry và rò ra file khác. Mutate object client được inject rồi reset trong từng test.

---

## 8. Đính chính so với work item (KHÔNG sửa trong tài liệu)

| claim của plan | verdict | correction |
| --- | --- | --- |
| HEAD `ecd516f` | **STALE** | `65cc6c1` trên `milestone-1`. |
| "`bun test` bị chặn bởi `Failed to load pi_natives native addon`" | **ĐÃ LỖI THỜI** | `packages/natives/native/pi_natives.darwin-arm64.node` tồn tại. `bun test` chạy: 1 file → `1 pass`; 4 file có sẵn → `52 pass / 0 fail / 181 expect`. Không cần `brew install ninja` hay `bun --cwd=packages/natives run build`. Bỏ bước đó khỏi phiếu. |
| "grep `readTextSlices test/` … **không** hit nào ở `redis-session-storage.test.ts`" | **SAI** | 8 hit trong file đó, gồm `it("readTextSlices returns byte windows from the head and tail")` ở **dòng 416** và `it("readTextSlices uses GETRANGE instead of GET")` ở **dòng 428**. Ngoài ra còn `test/session-listing-cache.test.ts` và `test/session-manager-close-race.test.ts`. Khe trống thật là **byte-EOF semantics khi row biến mất khỏi backend**, không phải "chưa từng gọi". |
| "`readSlices` trên path không tồn tại: SQL ném ENOENT, Redis trả `["",""]` … đây là **đường đọc thật**" | **SAI Ở TẦNG `SessionStorage`** | Probe: cả hai đều `THREW: ENOENT`. `IndexedSessionStorage.readTextSlices` (`indexed-session-storage.ts:281-282`) `if (!entry) throw enoent(path)` chặn trước, backend không được gọi. Chỉ lộ khi index còn entry mà row đã mất (probe: Redis trả `["",""]`). Vẫn là bug thật, nhưng **nhỏ hơn nhiều** và là mất dữ liệu âm thầm, không phải đường đọc sống. |
| "Redis `move` nuốt lỗi migration meta-hash … một group hình dạng `crossProcessLock` khẳng định rename nguyên tử sẽ **fail** trên Redis" | **SUY ĐOÁN, chưa kiểm chứng** | `move` là method `SessionStorageBackend`, không phải API `SessionStorage` (chỉ có `rename`, `session-storage.ts:157`). `IndexedSessionStorage.rename` (`:362-374`) cập nhật index trước rồi enqueue `backend.move` — group gọi `storage.rename()` **không** kiểm chứng tính nguyên tử của `move`. Ngoài ra `crossProcessLock` bị **bỏ qua** trên Redis theo chính scoping của plan, nên group đó không bao giờ chạy trên Redis. Hai ý này **loại trừ lẫn nhau**. |
| "cả hai delegate `super(backend)` — `sql-session-storage.ts:277-282` và `redis-session-storage.ts:116-120`" | **SAI** | 277–282 và 116–120 là `static async create(...)`. `super(backend)` thật ở `sql-session-storage.ts:267`; `RedisSessionStorage` **không** có constructor, `create` truyền thẳng `new RedisSessionStorageBackend(options)`. |
| "Nhóm `indexCoherence`: hai lần ghi liên tiếp nhanh sinh `mtimeMs` tăng nghiêm ngặt" | **SAI TRÊN MEMORY** | Đo thật: file `true`, indexed `true`, **memory `false`** (`m1 === m2 === 1790641139654`). `session-storage.ts:1154` dùng `Date.now()`. Đây là divergence thứ ba, plan không liệt kê. |
| "81 module helper chỉ-dùng-cho-test" | **ĐÚNG (đã commit), 82 trên working tree** | `git ls-files` → 81. `find` → 82 vì `packages/coding-agent/test/collab/web-wire.types.ts` chưa track. |
| "`sql-session-storage.test.ts:51-60`" là seam "đã được chứng minh" | **ĐÚNG VỊ TRÍ, ĐÚNG VAI TRÒ** | 51–60 là `const wrapped: SqlSessionStorageClient = {` bọc `unsafe`/`transaction`. Nhưng nó **chỉ quan sát query** — không có cổng tiêm lỗi, không có cổng đậu `readFull`. Hai cổng đó phải viết mới; tôi đã viết và chạy thử, lịch F1 pass. |
| "đặt ở `test/session/` chứ không phải `src/session/`" | **ĐÚNG** | `package.json:53-56` export map `"./*": { "types": "./src/*.ts", "import": "./src/*.ts" }` — đặt helper ở `src/` sẽ publish ra consumer. 82 helper module đã nằm dưới `test/`. |
